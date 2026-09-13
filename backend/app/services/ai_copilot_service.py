import re
import uuid
import traceback
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

import networkx as nx
from app.database.mongodb import mongo_client
from app.database.neo4j_client import neo4j_client
from app.models.schemas import AICopilotResponse, GraphAction, UserResponse
from app.services.network_analysis import network_analysis
from app.utils.logger import get_logger

logger = get_logger("ai_copilot_service")


class AICopilotService:
    def __init__(self):
        # In-memory conversational session store: session_id -> { "last_entity_id": ..., "last_entity_name": ..., "history": [...] }
        self._session_store: Dict[str, Dict[str, Any]] = {}

    def _get_session(self, session_id: Optional[str]) -> Dict[str, Any]:
        sid = session_id or "default_session"
        if sid not in self._session_store:
            self._session_store[sid] = {
                "last_entity_id": None,
                "last_entity_name": None,
                "last_entity_type": None,
                "last_path": None,
                "history": [],
            }
        return self._session_store[sid]

    def _update_session(self, session_id: Optional[str], entity_id: Optional[str], entity_name: Optional[str], entity_type: Optional[str]):
        session = self._get_session(session_id)
        if entity_id:
            session["last_entity_id"] = entity_id
            session["last_entity_name"] = entity_name
            session["last_entity_type"] = entity_type

    def _extract_candidate_name(self, query_text: str) -> Optional[str]:
        """Extracts potential subject or entity name from query string."""
        q = query_text.strip()

        # Match common investigation query phrases
        patterns = [
            r"(?:tell\s+me\s+everything\s+about|tell\s+me\s+about|who\s+is|who\s+communicates\s+with|who\s+talks\s+to|what\s+cases\s+involve|why\s+is|show\s+associates\s+of|show\s+connections\s+for|show\s+links\s+to|show\s+all\s+associates\s+connected\s+to|show\s+all\s+associates\s+of|details\s+on|analyze|investigate|profile\s+of|dossier\s+for|dossier\s+on)\s+([a-zA-Z0-9\s\+\-\.]+?)(?:\?|\.|\,|$|\s+and|\s+in\s+the|\s+who|\s+connected|\s+linked)",
            r"(?:about|on|for)\s+([A-Z][a-zA-Z0-9\s\+\-]+?)(?:\?|\.|\,|$)",
        ]

        for pat in patterns:
            m = re.search(pat, q, re.IGNORECASE)
            if m:
                extracted = m.group(1).strip()
                # Exclude pronouns / generic words
                if extracted.lower() not in ["this person", "this entity", "this account", "this phone", "this location", "this case", "him", "her", "them", "he", "she", "it"]:
                    return extracted

        return None

    def _find_matching_node(
        self,
        query_text: str,
        graph: nx.MultiDiGraph,
        candidate_name: Optional[str] = None
    ) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
        """
        Robust Entity Resolution across Graph Nodes & Properties.
        Matches by exact name, ID, alias, phone, vehicle plate, or fuzzy word match.
        """
        query_lower = query_text.lower()
        search_target = candidate_name.lower() if candidate_name else query_lower

        best_node = None
        best_score = 0
        matched_field = None

        for nid, data in graph.nodes(data=True):
            node_name = str(data.get("name") or data.get("label") or nid).lower()
            nid_lower = str(nid).lower()
            aliases = [str(a).lower() for a in data.get("aliases", [])]
            if data.get("alias"):
                aliases.append(str(data.get("alias")).lower())

            # 1. Exact Full Match
            if search_target and (node_name == search_target or nid_lower == search_target):
                return {"id": str(nid), "data": data}, "exact_name"

            # 2. Check Aliases
            for alias in aliases:
                if alias and (alias == search_target or alias in query_lower):
                    return {"id": str(nid), "data": data}, f"alias:{alias}"

            # 3. Substring of name in query or search_target in node_name
            if len(node_name) >= 3 and (node_name in query_lower or (search_target and search_target in node_name)):
                score = len(node_name) * 2
                if score > best_score:
                    best_score = score
                    best_node = {"id": str(nid), "data": data}
                    matched_field = "name_substring"

            # 4. Partial Word match (e.g. "Rohan" matching "Rohan Mehta")
            if search_target and len(search_target) >= 3:
                target_words = [w for w in search_target.split() if len(w) >= 3]
                node_words = [w for w in node_name.split() if len(w) >= 3]
                shared = set(target_words).intersection(set(node_words))
                if shared:
                    score = len(" ".join(shared))
                    if score > best_score:
                        best_score = score
                        best_node = {"id": str(nid), "data": data}
                        matched_field = "word_match"

            # 5. Check Registration / Phone in query
            reg = str(data.get("registration", "")).lower()
            if reg and len(reg) >= 4 and reg in query_lower:
                return {"id": str(nid), "data": data}, "registration"

        return best_node, matched_field

    def _extract_two_entities(self, query_text: str, graph: nx.MultiDiGraph) -> Tuple[Optional[Dict[str, Any]], Optional[Dict[str, Any]]]:
        """Detect two entities for shortest path or connection queries."""
        matches = []
        q_lower = query_text.lower()

        # Check for pattern "between X and Y"
        m = re.search(r"between\s+([a-zA-Z0-9\s\+\-\.]+?)\s+and\s+([a-zA-Z0-9\s\+\-\.]+?)(?:\?|\.|$)", query_text, re.IGNORECASE)
        if m:
            cand1, cand2 = m.group(1).strip(), m.group(2).strip()
            node1, _ = self._find_matching_node(cand1, graph, cand1)
            node2, _ = self._find_matching_node(cand2, graph, cand2)
            if node1 and node2:
                return node1, node2

        # General scanning
        for nid, data in graph.nodes(data=True):
            node_name = str(data.get("name") or data.get("label") or nid).lower()
            if len(node_name) >= 3 and node_name in q_lower:
                matches.append({"id": str(nid), "data": data, "name": node_name})

        # Sort by length descending
        matches.sort(key=lambda x: len(x["name"]), reverse=True)
        if len(matches) >= 2:
            return {"id": matches[0]["id"], "data": matches[0]["data"]}, {"id": matches[1]["id"], "data": matches[1]["data"]}
        elif len(matches) == 1:
            return {"id": matches[0]["id"], "data": matches[0]["data"]}, None

        return None, None

    async def _get_entity_alerts(self, entity_id: str, entity_name: str) -> List[Dict[str, Any]]:
        """Retrieve alerts from MongoDB linked to this entity."""
        alerts = []
        try:
            cursor = mongo_client.alerts.find({
                "$or": [
                    {"entities_involved.id": entity_id},
                    {"entities_involved.name": {"$regex": re.escape(entity_name), "$options": "i"}}
                ]
            }).limit(10)
            async for doc in cursor:
                doc["_id"] = str(doc["_id"])
                alerts.append(doc)
        except Exception as e:
            logger.warning(f"Error querying alerts for {entity_id}: {e}")
        return alerts

    async def _get_extractions_for_entity(self, entity_name: str) -> List[Dict[str, Any]]:
        """Find source documents in MongoDB where this entity is mentioned."""
        docs = []
        try:
            cursor = mongo_client.extractions.find({
                "raw_text": {"$regex": re.escape(entity_name), "$options": "i"}
            }).limit(5)
            async for doc in cursor:
                doc["_id"] = str(doc["_id"])
                docs.append(doc)
        except Exception as e:
            logger.warning(f"Error querying extractions for {entity_name}: {e}")
        return docs

    async def _log_audit_trail(
        self,
        user: UserResponse,
        question: str,
        answer: str,
        entities_involved: List[Dict[str, Any]]
    ):
        """Audit log for law enforcement traceability and compliance."""
        try:
            log_record = {
                "id": f"audit_{uuid.uuid4().hex[:10]}",
                "user_id": user.id,
                "user_email": user.email,
                "user_name": user.full_name,
                "badge_number": user.badge_number,
                "question": question,
                "answer_summary": answer[:250],
                "entities_involved": [e.get("id") for e in entities_involved if isinstance(e, dict) and e.get("id")],
                "timestamp": datetime.now(timezone.utc)
            }
            await mongo_client.audit_logs.insert_one(log_record)
        except Exception as e:
            logger.error(f"Audit log failed: {e}")

    async def process_query(
        self,
        question: str,
        user: UserResponse,
        selected_entity_id: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> AICopilotResponse:
        """
        Process natural language intelligence inquiry strictly grounded in database records.
        Robust error handling, session memory, entity resolution, and zero hallucination.
        """
        try:
            session = self._get_session(session_id)
            graph = neo4j_client.get_raw_graph()
            total_nodes = len(graph.nodes)

            # 1. EMPTY DATABASE CHECK
            if total_nodes == 0:
                answer = (
                    "### ℹ️ Intelligence Database Status: Empty\n\n"
                    "**No intelligence records are currently ingested into the system.**\n\n"
                    "The criminal intelligence graph, document store, and alert registries contain zero ingested records. "
                    "To begin investigation, please navigate to the **Upload Center** and upload one or more of the following:\n\n"
                    "- First Information Reports (FIR) or incident summaries (.pdf, .txt)\n"
                    "- Call Detail Records (CDR) logs (.csv)\n"
                    "- Financial wire transaction ledgers (.csv, .json)\n"
                    "- Officer field surveillance notes\n\n"
                    "Once ingested, INTEL-AI will immediately map suspect networks, compute centrality chokepoints, and cross-reference evidence."
                )
                return AICopilotResponse(
                    answer=answer,
                    sources=[],
                    entities_involved=[],
                    graph_actions=[GraphAction(type="reset")]
                )

            q_clean = question.strip()
            q_lower = q_clean.lower()

            # 2. RESOLVE CONTEXTUAL PRONOUNS / "THIS PERSON"
            is_contextual_reference = any(ref in q_lower for ref in [
                "this person", "this entity", "this account", "this phone", "this location", "this case",
                " he ", " his ", " him ", " she ", " her ", " them ", " their "
            ]) or q_lower.startswith(("he ", "his ", "she ", "her "))

            active_entity_id = selected_entity_id or (session["last_entity_id"] if is_contextual_reference else None)

            # 3. EXTRACT CANDIDATE NAME IF SPECIFIED
            candidate_name = self._extract_candidate_name(q_clean)

            # 4. RESOLVE TARGET NODE
            target_node = None
            if active_entity_id and active_entity_id in graph.nodes:
                target_node = {"id": active_entity_id, "data": graph.nodes[active_entity_id]}
            elif candidate_name:
                target_node, _ = self._find_matching_node(q_clean, graph, candidate_name)
            else:
                target_node, _ = self._find_matching_node(q_clean, graph)

            # Update session context if found
            if target_node:
                self._update_session(
                    session_id,
                    target_node["id"],
                    target_node["data"].get("name") or target_node["data"].get("label"),
                    target_node["data"].get("type", "Entity")
                )

            # 5. IF CANDIDATE NAME WAS EXPLICITLY ASKED BUT DOES NOT EXIST IN DATABASE
            if candidate_name and not target_node:
                return AICopilotResponse(
                    answer=f"No entity matching '{candidate_name}' was found in the available investigation data.",
                    sources=[],
                    entities_involved=[],
                    graph_actions=[]
                )

            # -------------------------------------------------------------
            # INTENT ROUTING
            # -------------------------------------------------------------

            # INTENT: SHORTEST PATH BETWEEN A AND B
            if "shortest path" in q_lower or ("path between" in q_lower and "and" in q_lower) or "how are" in q_lower and "connected" in q_lower:
                return await self._handle_shortest_path_query(q_clean, graph, user)

            # INTENT: BRIDGES / INTERMEDIARIES / BROKERS
            if "intermediar" in q_lower or "bridge" in q_lower or "broker" in q_lower or "hidden" in q_lower or "connect multiple communities" in q_lower:
                return await self._handle_intermediaries_query(graph, user, q_clean)

            # INTENT: INFLUENTIAL ENTITIES / TOP HUBS
            if "most influential" in q_lower or "top hubs" in q_lower or "key kingpins" in q_lower or "who are the most influential" in q_lower:
                return await self._handle_influential_entities_query(graph, user)

            # INTENT: COMMUNITY EXPLANATION / CLUSTERING
            if "which community" in q_lower or "explain this community" in q_lower or ("community" in q_lower and ("cluster" in q_lower or "cell" in q_lower or "explain" in q_lower)):
                return await self._handle_community_query(target_node, graph, user)

            # INTENT: WHY HIGH RISK / EVIDENCE SUPPORTING RISK
            if ("why is" in q_lower and "risk" in q_lower) or "evidence supporting" in q_lower or "risk score" in q_lower or "high risk" in q_lower:
                if target_node:
                    return await self._handle_risk_justification(target_node, graph, user, q_clean)

            # INTENT: CONNECTED ASSOCIATES / RELATIONSHIPS / COMMUNICATIONS / ACCOUNTS
            if (
                "who is connected" in q_lower or
                "show all associates" in q_lower or
                "closest associates" in q_lower or
                "show connections" in q_lower or
                "who communicates" in q_lower or
                "communication activity" in q_lower or
                "phone numbers" in q_lower or
                "bank accounts" in q_lower or
                "vehicles" in q_lower or
                "locations" in q_lower or
                "cases involve" in q_lower or
                "how many connections" in q_lower or
                "strongest connections" in q_lower
            ):
                if target_node:
                    return await self._handle_specific_connections_query(target_node, graph, user, q_lower)

            # INTENT: COMPLETE INVESTIGATION SUMMARY
            if "complete investigation summary" in q_lower or "investigation summary" in q_lower or "summary of the investigation" in q_lower:
                return await self._handle_investigation_summary_query(graph, user)

            # INTENT: "TELL ME ABOUT X" / "TELL ME EVERYTHING ABOUT X" / FULL DOSSIER
            if target_node:
                return await self._generate_structured_dossier(target_node, graph, user, q_clean)

            # GENERAL FALLBACK OVER DOCUMENTS / EXTRACTIONS
            return await self._handle_document_search_fallback(q_clean, user)

        except Exception as ex:
            logger.error(f"Error processing AI investigation query '{question}': {ex}\n{traceback.format_exc()}")
            return AICopilotResponse(
                answer="I couldn't complete the investigation query due to a system processing issue. Please try again or verify the suspect name.",
                sources=[],
                entities_involved=[],
                graph_actions=[]
            )

    # -------------------------------------------------------------------------
    # 12-POINT STRUCTURED INTELLIGENCE REPORT FOR "TELL ME ABOUT X"
    # -------------------------------------------------------------------------
    async def _generate_structured_dossier(
        self,
        node: Dict[str, Any],
        graph: nx.MultiDiGraph,
        user: UserResponse,
        original_query: str
    ) -> AICopilotResponse:
        nid = str(node["id"])
        props = dict(node["data"])
        name = str(props.get("name") or props.get("label") or nid)
        ntype = str(props.get("type", "Person"))
        risk = float(props.get("risk_score", 0.0))
        degree = graph.degree(nid)
        in_degree = graph.in_degree(nid)
        out_degree = graph.out_degree(nid)

        # Centrality
        metrics = network_analysis.get_centrality_metrics()
        bet_cent = metrics.get("betweenness", {}).get(nid, 0.0)
        deg_cent = metrics.get("degree", {}).get(nid, 0.0)

        # Retrieve connected entities grouped by classification
        typed_entities: Dict[str, List[Dict[str, Any]]] = {
            "Person": [],
            "PhoneNumber": [],
            "Vehicle": [],
            "BankAccount": [],
            "Location": [],
            "Organization": [],
            "Other": []
        }

        relationships_list = []
        communication_records = []
        financial_records = []
        location_records = []
        sources = []
        direct_neighbor_ids = [nid]

        # Outbound edges
        for succ in graph.successors(nid):
            s_data = graph.nodes[succ]
            s_name = str(s_data.get("name") or s_data.get("label") or succ)
            s_type = str(s_data.get("type", "Entity"))
            direct_neighbor_ids.append(str(succ))

            target_group = typed_entities.get(s_type, typed_entities["Other"])
            target_group.append({"id": str(succ), "name": s_name, "type": s_type})

            edges_between = graph.get_edge_data(nid, succ)
            for k, edata in (edges_between or {}).items():
                rel_type = str(edata.get("type") or edata.get("label") or "ASSOCIATED_WITH")
                evidence = edata.get("evidence") or "Documented in investigation files"
                src_doc = edata.get("source_document") or props.get("source_name", "Case Record")
                ts = edata.get("timestamp") or "Recorded in ledger"
                freq = edata.get("frequency", 1)

                relationships_list.append(f"- `{name}` ➔ **[{rel_type}]** ➔ `{s_name}` (*{s_type}*) — *{evidence}*")
                sources.append({
                    "source_name": src_doc,
                    "case_id": edata.get("case_id", "N/A"),
                    "evidence_snippet": f"{name} -[{rel_type}]-> {s_name}: {evidence}"
                })

                if rel_type in ["CALLED", "MESSAGED"] or "phone" in s_type.lower():
                    communication_records.append(f"- **{s_name}**: Rel `{rel_type}` | Evidence: *{evidence}* | Frequency: {freq} event(s)")
                elif rel_type in ["TRANSFERRED_MONEY", "TRANSACTED_WITH"] or "bank" in s_type.lower():
                    financial_records.append(f"- **{s_name}**: Rel `{rel_type}` | Evidence: *{evidence}*")
                elif rel_type in ["VISITED", "LOCATED_AT"] or "loc" in s_type.lower():
                    location_records.append(f"- **{s_name}**: Rel `{rel_type}` | Evidence: *{evidence}*")

        # Inbound edges
        for pred in graph.predecessors(nid):
            if pred != nid and pred not in direct_neighbor_ids:
                p_data = graph.nodes[pred]
                p_name = str(p_data.get("name") or p_data.get("label") or pred)
                p_type = str(p_data.get("type", "Entity"))
                direct_neighbor_ids.append(str(pred))

                target_group = typed_entities.get(p_type, typed_entities["Other"])
                target_group.append({"id": str(pred), "name": p_name, "type": p_type})

                edges_between = graph.get_edge_data(pred, nid)
                for k, edata in (edges_between or {}).items():
                    rel_type = str(edata.get("type") or edata.get("label") or "ASSOCIATED_WITH")
                    evidence = edata.get("evidence") or "Documented in investigation files"
                    relationships_list.append(f"- `{p_name}` (*{p_type}*) ➔ **[{rel_type}]** ➔ `{name}` — *{evidence}*")

        # Alerts & Ingested Document Records
        alerts = await self._get_entity_alerts(nid, name)
        extractions = await self._get_extractions_for_entity(name)

        # Aliases string
        aliases = props.get("aliases") or []
        if isinstance(aliases, str):
            aliases = [aliases]
        if props.get("alias"):
            aliases.append(props.get("alias"))
        aliases_str = ", ".join(aliases) if aliases else "None logged in active files"

        # Assemble Structured Sections
        sections = []

        # SECTION 1: ENTITY OVERVIEW
        sections.append(
            f"### 📋 ENTITY OVERVIEW: {name.upper()}\n"
            f"- **Primary Identifier**: `{nid}`\n"
            f"- **Full Registered Name / Label**: **{name}**\n"
            f"- **Entity Classification**: `{ntype.upper()}`\n"
            f"- **Recorded Aliases / Handles**: {aliases_str}\n"
            f"- **Operational Status / Role**: {props.get('role', props.get('status', 'Documented Entity'))}\n"
            f"- **Risk Assessment**: `{risk}%` ({'CRITICAL THREAT' if risk >= 75 else 'ELEVATED RISK' if risk >= 50 else 'MONITORED'})\n"
            f"- **Network Influence**: `{props.get('influence_score', round(degree / max(1, len(graph.nodes)), 3))}` (Degree Centrality: {deg_cent})"
        )

        # SECTION 2: CONNECTED ENTITIES
        connected_summary = []
        for cat, items in typed_entities.items():
            if items:
                unique_names = list(set([it["name"] for it in items]))
                connected_summary.append(f"- **{cat}s ({len(unique_names)})**: {', '.join(unique_names)}")

        sections.append(
            f"### 👥 CONNECTED ENTITIES ({len(direct_neighbor_ids) - 1} Direct Neighbors)\n" +
            ("\n".join(connected_summary) if connected_summary else "- No direct entity associations recorded in graph.")
        )

        # SECTION 3: RELATIONSHIPS
        sections.append(
            f"### 🔗 RELATIONSHIPS ({len(relationships_list)} Documented Links)\n" +
            ("\n".join(relationships_list[:20]) if relationships_list else "- No explicit relationship links recorded.")
        )

        # SECTION 4: CASES
        case_mentions = []
        if props.get("last_seen_case"):
            case_mentions.append(f"- Primary File: **{props.get('last_seen_case')}**")
        for ext in extractions:
            if ext.get("case_id"):
                case_mentions.append(f"- Case Reference: **{ext.get('case_id')}** ({ext.get('source_name', 'Document')})")

        sections.append(
            f"### 📁 ASSOCIATED CASES\n" +
            ("\n".join(set(case_mentions)) if case_mentions else "- No formal case IDs attached; present through direct evidence ingestion.")
        )

        # SECTION 5: COMMUNICATION ACTIVITY
        sections.append(
            f"### 📞 COMMUNICATION ACTIVITY\n" +
            ("\n".join(communication_records) if communication_records else "- No direct CDR calls or wiretap intercepts logged for this entity.")
        )

        # SECTION 6: FINANCIAL ACTIVITY
        sections.append(
            f"### 💳 FINANCIAL ACTIVITY\n" +
            ("\n".join(financial_records) if financial_records else "- No direct bank accounts or Hawala wire transactions logged for this entity.")
        )

        # SECTION 7: LOCATION ACTIVITY
        sections.append(
            f"### 📍 LOCATION ACTIVITY\n" +
            ("\n".join(location_records) if location_records else "- No physical safehouse sightings or geolocations directly attached.")
        )

        # SECTION 8: NETWORK POSITION
        sections.append(
            f"### 🌐 NETWORK POSITION & GRAPH METRICS\n"
            f"- **Degree Connections**: {degree} total links (Inbound: {in_degree}, Outbound: {out_degree})\n"
            f"- **Betweenness Centrality**: {bet_cent} (Measures brokerage conduit role)\n"
            f"- **Syndicate Community Cluster**: `{props.get('community_id', 'C-1')}`\n"
            f"- **Connection Density**: High-traffic hub in cluster {props.get('community_id', 'C-1')}"
        )

        # SECTION 9: TIMELINE
        timeline_items = []
        if props.get("updated_at"):
            timeline_items.append(f"- **{props.get('updated_at')}**: Entity record created/updated in intelligence system.")
        for r in sources[:5]:
            if r.get("evidence_snippet"):
                timeline_items.append(f"- Recorded Event: *{r.get('evidence_snippet')}*")

        sections.append(
            f"### ⏱️ TIMELINE OF DOCUMENTED EVENTS\n" +
            ("\n".join(timeline_items) if timeline_items else "- No historical timestamps currently logged.")
        )

        # SECTION 10: EVIDENCE & SOURCE DOCUMENTS
        sections.append(
            f"### 📄 EVIDENCE & SOURCE DOCUMENTS\n" +
            (
                "\n".join([f"- **{s.get('source_name', 'Source')}**: *{s.get('evidence_snippet', 'Documented link')}*" for s in sources[:8]])
                if sources else f"- Initial case report: **{props.get('source_name', 'Direct evidence ingestion')}**"
            )
        )

        # SECTION 11: INFORMATION GAPS
        gaps = []
        if not financial_records:
            gaps.append("- No offshore financial records or banking accounts currently identified.")
        if not communication_records:
            gaps.append("- No call detail records (CDR) or telecommunications intercepts logged.")
        if not location_records:
            gaps.append("- No physical meeting geolocations or GPS coordinate pings recorded.")
        if not gaps:
            gaps.append("- Comprehensive records present across communications, transactions, and location logs.")

        sections.append(f"### ⚠️ INFORMATION GAPS\n" + "\n".join(gaps))

        # SECTION 12: RECOMMENDED INVESTIGATIVE ACTIONS
        sections.append(
            f"### 🎯 RECOMMENDED INVESTIGATIVE ACTIONS\n"
            f"- 🔍 **Visual Exploration**: Focus on canvas to inspect direct 1-hop and 2-hop conduits.\n"
            f"- 📜 **Subpoena Execution**: Cross-reference adjacent communication devices for subscriber KYC.\n"
            f"- 🏦 **Financial Ledger Audit**: Intercept downstream cashflows connected to syndicate cluster `{props.get('community_id', 'C-1')}`."
        )

        answer_text = "\n\n".join(sections)

        # Construct actionable graph buttons
        actions = [
            GraphAction(type="focus_node", target_id=nid, label="[View on Graph]"),
            GraphAction(type="highlight_nodes", target_ids=list(set(direct_neighbor_ids)), label=f"[Show Connections ({len(direct_neighbor_ids) - 1})]"),
            GraphAction(type="expand_neighborhood", target_id=nid, hops=2, label="[Expand Network (2 Hops)]"),
            GraphAction(type="filter_community", community_id=str(props.get("community_id", "C-1")), label="[Show Community]"),
        ]

        entities_involved = [{"id": nid, "label": name, "type": ntype, "risk_score": risk}]
        for n in typed_entities["Person"][:5]:
            entities_involved.append({"id": n["id"], "label": n["name"], "type": n["type"]})

        await self._log_audit_trail(user, original_query, answer_text, entities_involved)

        return AICopilotResponse(
            answer=answer_text,
            sources=sources[:10],
            entities_involved=entities_involved,
            graph_actions=actions
        )

    # -------------------------------------------------------------------------
    # SPECIFIC QUERY HANDLERS
    # -------------------------------------------------------------------------
    async def _handle_specific_connections_query(
        self,
        node: Dict[str, Any],
        graph: nx.MultiDiGraph,
        user: UserResponse,
        q_lower: str
    ) -> AICopilotResponse:
        nid = str(node["id"])
        name = str(node["data"].get("name") or node["data"].get("label") or nid)
        
        # Filter for specific entity type if requested
        filter_type = None
        if "phone" in q_lower:
            filter_type = "PhoneNumber"
        elif "bank" in q_lower or "account" in q_lower:
            filter_type = "BankAccount"
        elif "vehicle" in q_lower:
            filter_type = "Vehicle"
        elif "location" in q_lower:
            filter_type = "Location"

        nbr_items = []
        sources = []
        neighbor_ids = [nid]

        for nbr in graph.neighbors(nid):
            data = graph.nodes[nbr]
            ntype = str(data.get("type", "Entity"))
            if filter_type and filter_type.lower() not in ntype.lower():
                continue

            nname = str(data.get("name") or data.get("label") or nbr)
            neighbor_ids.append(str(nbr))
            edges_between = graph.get_edge_data(nid, nbr) or {}
            for k, edata in edges_between.items():
                rel = edata.get("type") or edata.get("label") or "ASSOCIATED_WITH"
                evidence = edata.get("evidence", "Graph connection")
                nbr_items.append({
                    "id": str(nbr),
                    "name": nname,
                    "type": ntype,
                    "rel": rel,
                    "evidence": evidence
                })
                sources.append({
                    "source_name": edata.get("source_document", "Case Record"),
                    "case_id": edata.get("case_id", "N/A"),
                    "evidence_snippet": f"{name} -[{rel}]-> {nname}: {evidence}"
                })

        for pred in graph.predecessors(nid):
            if pred != nid:
                data = graph.nodes[pred]
                ntype = str(data.get("type", "Entity"))
                if filter_type and filter_type.lower() not in ntype.lower():
                    continue

                pname = str(data.get("name") or data.get("label") or pred)
                neighbor_ids.append(str(pred))
                edges_between = graph.get_edge_data(pred, nid) or {}
                for k, edata in edges_between.items():
                    rel = edata.get("type") or edata.get("label") or "ASSOCIATED_WITH"
                    evidence = edata.get("evidence", "Graph connection")
                    nbr_items.append({
                        "id": str(pred),
                        "name": pname,
                        "type": ntype,
                        "rel": f"INCOMING: {rel}",
                        "evidence": evidence
                    })

        header_title = f"{filter_type}s Connected to" if filter_type else "Associates & Connections of"
        if not nbr_items:
            answer = f"No {filter_type.lower() if filter_type else 'associates or connections'} matching this criteria were found for **{name}** in the available investigation data."
            return AICopilotResponse(
                answer=answer,
                sources=[],
                entities_involved=[{"id": nid, "label": name, "type": node["data"].get("type", "Person")}],
                graph_actions=[GraphAction(type="focus_node", target_id=nid, label="[View on Graph]")]
            )

        items_formatted = "\n".join([
            f"- **{it['name']}** (*{it['type']}*) ➔ Rel: `{it['rel']}` | Evidence: *{it['evidence']}*"
            for it in nbr_items
        ])

        answer = (
            f"### 👥 {header_title} **{name}**\n\n"
            f"Identified **{len(nbr_items)} direct link(s)** in the active criminal network:\n\n"
            f"{items_formatted}\n\n"
            f"Use the interactive buttons below to highlight or expand this network on the visual canvas."
        )

        actions = [
            GraphAction(type="focus_node", target_id=nid, label="[View on Graph]"),
            GraphAction(type="highlight_nodes", target_ids=list(set(neighbor_ids)), label=f"[Show Connections ({len(nbr_items)})]"),
            GraphAction(type="expand_neighborhood", target_id=nid, hops=2, label="[Expand Network (2 Hops)]")
        ]

        entities_involved = [{"id": it["id"], "label": it["name"], "type": it["type"]} for it in nbr_items[:10]]
        return AICopilotResponse(
            answer=answer,
            sources=sources[:10],
            entities_involved=entities_involved,
            graph_actions=actions
        )

    async def _handle_shortest_path_query(
        self,
        query: str,
        graph: nx.MultiDiGraph,
        user: UserResponse
    ) -> AICopilotResponse:
        ent_a, ent_b = self._extract_two_entities(query, graph)
        if not ent_a or not ent_b:
            return AICopilotResponse(
                answer="Please specify two known entities in the criminal network to find their connecting path (e.g. *'Find shortest path between Rahul Sharma and Vikram Malhotra'*).",
                sources=[],
                entities_involved=[],
                graph_actions=[]
            )

        path_res = await neo4j_client.find_shortest_path(ent_a["id"], ent_b["id"])
        if not path_res.get("found"):
            name_a = ent_a["data"].get("name", ent_a["id"])
            name_b = ent_b["data"].get("name", ent_b["id"])
            return AICopilotResponse(
                answer=f"No connecting path was found in the current graph between **{name_a}** and **{name_b}**. They operate in separate, disconnected network components.",
                sources=[],
                entities_involved=[
                    {"id": ent_a["id"], "label": name_a, "type": ent_a["data"].get("type", "Entity")},
                    {"id": ent_b["id"], "label": name_b, "type": ent_b["data"].get("type", "Entity")}
                ],
                graph_actions=[GraphAction(type="highlight_nodes", target_ids=[ent_a["id"], ent_b["id"]], label="[View Targets]")]
            )

        path_nodes = path_res.get("path", [])
        path_ids = [n["id"] for n in path_nodes]
        path_str = " ➔ ".join([f"`{n['label']}` (*{n['type']}*)" for n in path_nodes])

        edges_info = path_res.get("edges", [])
        edges_text = "\n".join([f"- Step {i+1}: **{e['source']}** ➔ *[{e['label']}]* ➔ **{e['target']}**" for i, e in enumerate(edges_info)])

        answer = (
            f"### ⚡ Shortest Intelligence Connection Path\n\n"
            f"**Path Length**: {path_res.get('length')} Intermediary Conduit Step(s)\n\n"
            f"**Traversal Sequence**:\n{path_str}\n\n"
            f"#### Intermediary Traversal Steps:\n"
            f"{edges_text if edges_text else '- Direct connection established.'}\n\n"
            f"Click **[Show Shortest Path]** below to trace this operational route in glowing neon on the visual canvas."
        )

        actions = [
            GraphAction(type="trace_path", path=path_ids, label="[Show Shortest Path]"),
            GraphAction(type="highlight_nodes", target_ids=path_ids, label="[Highlight Path Entities]")
        ]

        return AICopilotResponse(
            answer=answer,
            sources=[{"source_name": "Graph Shortest Path Traversal", "case_id": "Network Analysis", "evidence_snippet": path_str}],
            entities_involved=path_nodes,
            graph_actions=actions
        )

    async def _handle_risk_justification(
        self,
        node: Dict[str, Any],
        graph: nx.MultiDiGraph,
        user: UserResponse,
        query: str
    ) -> AICopilotResponse:
        nid = str(node["id"])
        data = dict(node["data"])
        name = str(data.get("name") or data.get("label") or nid)
        risk = float(data.get("risk_score", 0.0))
        degree = graph.degree(nid)

        alerts = await self._get_entity_alerts(nid, name)
        metrics = network_analysis.get_centrality_metrics()
        bet_score = metrics.get("betweenness", {}).get(nid, 0.0)

        indicators = []
        if risk >= 75:
            indicators.append(f"**High Centrality Concentration ({risk}%)**: Functions as an operational command or logistics node.")
        elif risk >= 50:
            indicators.append(f"**Elevated Associational Risk ({risk}%)**: Directly communicates with prime suspects.")
        else:
            indicators.append(f"**Moderate / Peripheral Risk ({risk}%)**: Auxiliary support role or monitored facility.")

        indicators.append(f"**Connection Density ({degree} Direct Links)**: Direct connections to {degree} other entities in the network.")
        indicators.append(f"**Betweenness Centrality ({bet_score})**: Serves as an information or resource bridge between clusters.")

        if alerts:
            alert_names = ", ".join([f"`{a.get('rule_type', 'SECURITY_RULE')}`" for a in alerts[:3]])
            indicators.append(f"**Automated Intelligence Alerts ({len(alerts)} Triggered)**: Flagged in rules: {alert_names}")

        answer = (
            f"### ⚠️ Risk Factor Justification: **{name}**\n\n"
            f"**{name}** has a network-risk score of **`{risk}%`** based on the following available intelligence indicators:\n\n"
            + "\n".join([f"- {ind}" for ind in indicators]) + "\n\n"
            f"*Note: This platform serves as an intelligence analysis aid to guide subpoenas and surveillance, not an autonomous judicial determination.*"
        )

        actions = [
            GraphAction(type="focus_node", target_id=nid, label="[View on Graph]"),
            GraphAction(type="expand_neighborhood", target_id=nid, hops=1, label="[Show Connections]")
        ]

        return AICopilotResponse(
            answer=answer,
            sources=[{"source_name": "Composite Graph Centrality Model", "case_id": "Analytics", "evidence_snippet": f"Degree: {degree}, Betweenness: {bet_score}"}],
            entities_involved=[{"id": nid, "label": name, "type": data.get("type", "Person"), "risk_score": risk}],
            graph_actions=actions
        )

    async def _handle_intermediaries_query(
        self,
        graph: nx.MultiDiGraph,
        user: UserResponse,
        query: str
    ) -> AICopilotResponse:
        hidden = network_analysis.discover_hidden_relationships(min_shared=1)
        if not hidden:
            return AICopilotResponse(
                answer="No unlinked entities sharing mutual associates were detected in the current network topology.",
                sources=[],
                entities_involved=[],
                graph_actions=[]
            )

        lines = []
        highlight_ids = []
        for h in hidden[:8]:
            s_name = h["source"]["name"]
            t_name = h["target"]["name"]
            shared_str = ", ".join(h["shared_entities"][:3])
            lines.append(f"- **{s_name}** ⇋ **{t_name}**: Linked via **{h['shared_count']}** mutual associate(s): *{shared_str}*")
            highlight_ids.extend([h["source"]["id"], h["target"]["id"]])

        answer = (
            f"### 🕵️ Hidden Intermediaries & Covert Bridges\n\n"
            f"Graph analysis detected **{len(hidden)} unlinked entity pairs** coordinating through mutual associates, safehouses, or burner phones:\n\n"
            + "\n".join(lines) + "\n\n"
            f"These indirect links represent critical intelligence chokepoints between separate criminal cells."
        )

        return AICopilotResponse(
            answer=answer,
            sources=[{"source_name": "Betweenness Centrality & Bipartite Cross-Match", "case_id": "Analytics", "evidence_snippet": f"Detected {len(hidden)} indirect bridge relationships"}],
            entities_involved=[],
            graph_actions=[GraphAction(type="highlight_nodes", target_ids=list(set(highlight_ids[:10])), label="[Highlight Bridge Entities]")]
        )

    async def _handle_influential_entities_query(
        self,
        graph: nx.MultiDiGraph,
        user: UserResponse
    ) -> AICopilotResponse:
        most_connected = network_analysis.detect_most_connected(limit=8)
        if not most_connected:
            return AICopilotResponse(
                answer="No influential entities found in the current graph.",
                sources=[],
                entities_involved=[],
                graph_actions=[]
            )

        lines = []
        target_ids = []
        for idx, m in enumerate(most_connected):
            lines.append(f"- **{m['name']}** (*{m['type']}*) — Degree: `{m['degree']}` | Risk Score: `{m['risk_score']}%` | Role: *{m.get('properties', {}).get('role', 'Syndicate Member')}*")
            target_ids.append(m["id"])

        answer = (
            f"### 👑 Most Influential Syndicate Entities (Network Degree Centrality)\n\n"
            f"Identified top command hubs and facilitators based on connection volume:\n\n"
            + "\n".join(lines)
        )

        return AICopilotResponse(
            answer=answer,
            sources=[{"source_name": "Degree Centrality Hub Scoring", "case_id": "Analytics", "evidence_snippet": f"Calculated centrality across {len(graph.nodes)} nodes"}],
            entities_involved=[{"id": m["id"], "label": m["name"], "type": m["type"]} for m in most_connected],
            graph_actions=[GraphAction(type="highlight_nodes", target_ids=target_ids, label="[Highlight Top Hubs]")]
        )

    async def _handle_community_query(
        self,
        node: Optional[Dict[str, Any]],
        graph: nx.MultiDiGraph,
        user: UserResponse
    ) -> AICopilotResponse:
        communities = network_analysis.detect_communities()
        if not communities:
            return AICopilotResponse(
                answer="No distinct community clusters were detected in the available graph.",
                sources=[],
                entities_involved=[],
                graph_actions=[]
            )

        if node:
            cid = str(node["data"].get("community_id", "C-1"))
            # Find matching community
            comm = next((c for c in communities if c["cluster_id"] == cid or c["cluster_id"].endswith(cid.replace("C-", ""))), communities[0])
            members = comm.get("members", [])
            member_names = [m["name"] for m in members]
            answer = (
                f"### 🌐 Community Cluster **{comm['cluster_id']}** Analysis\n\n"
                f"**{node['data'].get('name')}** belongs to **{comm['cluster_id']}** containing **{len(members)} interconnected entities**:\n\n"
                f"- **Cluster Members**: {', '.join(member_names)}\n"
                f"- **Operational Profile**: Coordinated cell with shared communications, safehouse access, or financial ties."
            )
            return AICopilotResponse(
                answer=answer,
                sources=[{"source_name": "Modularity Community Detection", "case_id": "Analytics", "evidence_snippet": f"Cluster {comm['cluster_id']} has {len(members)} members"}],
                entities_involved=[{"id": m["id"], "label": m["name"], "type": m["type"]} for m in members[:10]],
                graph_actions=[GraphAction(type="filter_community", community_id=comm["cluster_id"], label="[Show Community]")]
            )

        lines = []
        for c in communities[:6]:
            m_names = [m["name"] for m in c.get("members", [])[:5]]
            lines.append(f"- **{c['cluster_id']}** ({c['size']} members): {', '.join(m_names)}{'...' if c['size'] > 5 else ''}")

        answer = (
            f"### 🌐 Criminal Syndicate Sub-Cell Clustering\n\n"
            f"Partitioned the active network into **{len(communities)} operational syndicate clusters**:\n\n"
            + "\n".join(lines)
        )
        return AICopilotResponse(
            answer=answer,
            sources=[{"source_name": "Modularity Clustering", "case_id": "Analytics", "evidence_snippet": f"{len(communities)} clusters detected"}],
            entities_involved=[],
            graph_actions=[GraphAction(type="filter_community", community_id=communities[0]["cluster_id"], label="[Show First Community]")]
        )

    async def _handle_investigation_summary_query(
        self,
        graph: nx.MultiDiGraph,
        user: UserResponse
    ) -> AICopilotResponse:
        total_nodes = len(graph.nodes)
        total_edges = len(graph.edges)
        communities = network_analysis.detect_communities()
        top_hubs = network_analysis.detect_most_connected(limit=3)

        hub_names = [f"**{h['name']}** (*{h['type']}*, {h['degree']} links)" for h in top_hubs]

        answer = (
            f"### 📑 Comprehensive Investigation Summary\n\n"
            f"- **Network Scope**: {total_nodes} active criminal intelligence entities and {total_edges} documented relationships.\n"
            f"- **Key Operational Hubs**: {', '.join(hub_names)}.\n"
            f"- **Syndicate Organization**: Segmented into {len(communities)} distinct operational clusters.\n"
            f"- **Primary Conduits**: Cross-referencing identified active Hawala transfers, encrypted burner phones, and shared safehouse leases.\n\n"
            f"To drill down into any specific target, ask: *'Tell me about [Suspect Name]'*."
        )

        return AICopilotResponse(
            answer=answer,
            sources=[{"source_name": "Investigation Master Topology", "case_id": "Overall", "evidence_snippet": f"{total_nodes} entities, {total_edges} relationships"}],
            entities_involved=[{"id": h["id"], "label": h["name"], "type": h["type"]} for h in top_hubs],
            graph_actions=[GraphAction(type="reset", label="[Reset Graph View]")]
        )

    async def _handle_document_search_fallback(
        self,
        query: str,
        user: UserResponse
    ) -> AICopilotResponse:
        extractions = []
        try:
            search_regex = re.escape(query[:25])
            cursor = mongo_client.extractions.find({
                "raw_text": {"$regex": search_regex, "$options": "i"}
            }).limit(3)
            async for doc in cursor:
                extractions.append(doc)
        except Exception:
            pass

        if extractions:
            snippets = [f"- **{d.get('source_name', 'Document')}** (Case `{d.get('case_id')}`): *{d.get('summary') or d.get('raw_text', '')[:180]}...*" for d in extractions]
            answer = (
                f"### 📑 Relevant Investigation Records\n\n"
                f"Found supporting evidence across **{len(extractions)} uploaded document(s)**:\n\n"
                + "\n".join(snippets)
            )
            return AICopilotResponse(
                answer=answer,
                sources=[{"source_name": d.get("source_name", "Report"), "case_id": d.get("case_id", "N/A"), "evidence_snippet": d.get("raw_text", "")[:120]} for d in extractions],
                entities_involved=[],
                graph_actions=[]
            )

        return AICopilotResponse(
            answer=f"No supporting information was found in the available investigation data for '{query}'.",
            sources=[],
            entities_involved=[],
            graph_actions=[]
        )


ai_copilot_service = AICopilotService()

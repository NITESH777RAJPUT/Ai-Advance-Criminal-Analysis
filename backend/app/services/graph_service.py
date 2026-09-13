import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from app.database.mongodb import mongo_client
from app.database.neo4j_client import neo4j_client
from app.models.schemas import (
    EntityType,
    ExtractionResult,
    GraphEdge,
    GraphNode,
    NetworkGraphResponse,
    RelationshipType,
)
from app.utils.logger import get_logger

logger = get_logger("graph_service")


class GraphService:
    @staticmethod
    @staticmethod
    def _normalize_id(name: str, entity_type: Any) -> str:
        clean = "".join(c if c.isalnum() else "_" for c in name.strip()).lower().strip("_")
        type_str = entity_type.value if hasattr(entity_type, "value") else str(entity_type)
        prefix = type_str[:4].lower()
        return f"{prefix}_{clean}"

    async def ingest_extraction(
        self,
        extraction: ExtractionResult,
        case_id: Optional[str] = None,
        source_name: Optional[str] = None,
        uploaded_by: str = "system"
    ) -> Dict[str, Any]:
        """Persists extracted entities and relationships into Neo4j and MongoDB."""
        nodes_created = 0
        edges_created = 0
        node_id_map: Dict[str, str] = {}  # name.lower() -> node_id

        # 1. Ingest Nodes into Neo4j
        for ent in extraction.entities:
            node_id = ent.id or self._normalize_id(ent.name, ent.type)
            node_id_map[ent.name.lower()] = node_id

            type_val = ent.type.value if hasattr(ent.type, "value") else str(ent.type)
            props = {
                "name": ent.name,
                "type": type_val,
                "confidence": ent.confidence,
                "risk_score": ent.risk_score,
                "last_seen_case": case_id or "Direct Input",
                "source_name": source_name or "Report",
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            props.update(ent.metadata)
            await neo4j_client.add_node(node_id=node_id, label=type_val, properties=props)
            nodes_created += 1

        # 2. Ingest Relationships into Neo4j
        for rel in extraction.relationships:
            source_id = node_id_map.get(rel.source.lower()) or self._normalize_id(rel.source, rel.source_type)
            target_id = node_id_map.get(rel.target.lower()) or self._normalize_id(rel.target, rel.target_type)

            source_type_val = rel.source_type.value if hasattr(rel.source_type, "value") else str(rel.source_type)
            target_type_val = rel.target_type.value if hasattr(rel.target_type, "value") else str(rel.target_type)

            # Ensure source and target nodes exist in graph
            if source_id not in node_id_map.values():
                await neo4j_client.add_node(source_id, source_type_val, {"name": rel.source, "type": source_type_val})
            if target_id not in node_id_map.values():
                await neo4j_client.add_node(target_id, target_type_val, {"name": rel.target, "type": target_type_val})

            rel_type_val = rel.relationship_type.value if hasattr(rel.relationship_type, "value") else str(rel.relationship_type)
            edge_props = {
                "confidence": rel.confidence,
                "evidence": rel.evidence or f"Mentioned in {source_name or 'case'}",
                "case_id": case_id,
                "source_document": source_name or case_id or "Investigation File",
                "frequency": rel.metadata.get("frequency", 1) if (hasattr(rel, "metadata") and rel.metadata) else 1,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            if hasattr(rel, "metadata") and rel.metadata:
                edge_props.update(rel.metadata)

            await neo4j_client.add_relationship(
                source_id=source_id,
                target_id=target_id,
                rel_type=rel_type_val,
                properties=edge_props
            )
            edges_created += 1

        # 3. Store extraction result in MongoDB for intelligence audit trail
        extraction_doc = {
            "id": f"ext_{uuid.uuid4().hex[:8]}",
            "case_id": case_id,
            "source_name": source_name,
            "uploaded_by": uploaded_by,
            "entities_count": len(extraction.entities),
            "relationships_count": len(extraction.relationships),
            "raw_text": extraction.raw_text,
            "summary": extraction.summary,
            "created_at": datetime.now(timezone.utc)
        }
        await mongo_client.extractions.insert_one(extraction_doc)

        logger.info(f"Graph ingested: {nodes_created} nodes, {edges_created} edges from {source_name or 'raw text'}.")
        return {
            "nodes_created": nodes_created,
            "edges_created": edges_created,
            "extraction_id": extraction_doc["id"]
        }

    async def get_network(
        self,
        node_types: Optional[List[str]] = None,
        rel_types: Optional[List[str]] = None,
        limit: int = 250
    ) -> NetworkGraphResponse:
        data = await neo4j_client.get_network(node_types=node_types, rel_types=rel_types, limit=limit)
        nodes = [GraphNode(**n) for n in data.get("nodes", [])]
        edges = [GraphEdge(**e) for e in data.get("edges", [])]
        return NetworkGraphResponse(nodes=nodes, edges=edges, stats=data.get("stats", {}))

    async def get_person_details(self, person_id: str) -> Optional[Dict[str, Any]]:
        """Fetch profile, risk score, connected neighbors and related cases."""
        nx_graph = neo4j_client.get_raw_graph()
        if person_id not in nx_graph:
            return None

        node_data = dict(nx_graph.nodes[person_id])
        degree = nx_graph.degree(person_id)

        # Get 1-hop neighbors
        neighbors = []
        for nbr in nx_graph.neighbors(person_id):
            nbr_data = dict(nx_graph.nodes[nbr])
            edge_data = nx_graph.get_edge_data(person_id, nbr)
            rel_label = next(iter(edge_data.values())).get("label", "LINKED") if edge_data else "LINKED"
            neighbors.append({
                "id": str(nbr),
                "name": nbr_data.get("name", str(nbr)),
                "type": nbr_data.get("type", "Entity"),
                "relation": rel_label,
                "direction": "outbound"
            })

        # Inbound neighbors
        for pred in nx_graph.predecessors(person_id):
            pred_data = dict(nx_graph.nodes[pred])
            edge_data = nx_graph.get_edge_data(pred, person_id)
            rel_label = next(iter(edge_data.values())).get("label", "LINKED") if edge_data else "LINKED"
            neighbors.append({
                "id": str(pred),
                "name": pred_data.get("name", str(pred)),
                "type": pred_data.get("type", "Entity"),
                "relation": rel_label,
                "direction": "inbound"
            })

        return {
            "id": person_id,
            "name": node_data.get("name", person_id),
            "type": node_data.get("type", "Person"),
            "risk_score": float(node_data.get("risk_score", 0.0)),
            "connections_count": degree,
            "properties": node_data,
            "neighbors": neighbors
        }

    async def search_entities(
        self,
        query: Optional[str] = None,
        entity_type: Optional[str] = None,
        min_risk: float = 0.0,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        nx_graph = neo4j_client.get_raw_graph()
        results = []

        q_lower = query.lower() if query else ""
        for n_id, data in nx_graph.nodes(data=True):
            ntype = data.get("type", "Entity")
            name = data.get("name", str(n_id))
            risk = float(data.get("risk_score", 0.0))

            if entity_type and entity_type.lower() != "all" and ntype.lower() != entity_type.lower():
                continue
            if risk < min_risk:
                continue
            if q_lower and q_lower not in name.lower() and q_lower not in str(n_id).lower():
                continue

            results.append({
                "id": str(n_id),
                "name": name,
                "type": ntype,
                "risk_score": risk,
                "connections_count": nx_graph.degree(n_id),
                "properties": data
            })

        # Sort by risk score and connections
        results.sort(key=lambda x: (x["risk_score"], x["connections_count"]), reverse=True)
        return results[:limit]


graph_service = GraphService()


import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
import networkx as nx
from app.database.mongodb import mongo_client
from app.database.neo4j_client import neo4j_client
from app.models.schemas import (
    AlertRecord,
    AlertRuleType,
    AlertSeverity,
    AlertStatus,
    EntityType,
    RelationshipType,
)
from app.utils.logger import get_logger

logger = get_logger("alert_service")


class AlertService:
    @staticmethod
    def get_graph() -> nx.MultiDiGraph:
        return neo4j_client.get_raw_graph()

    async def run_detection(self) -> List[AlertRecord]:
        """Executes the rule-based suspicious activity detection engine across the network."""
        g = self.get_graph()
        generated_alerts: List[AlertRecord] = []
        now = datetime.now(timezone.utc)

        # -------------------------------------------------------------
        # Rule 1: One phone connected to many suspects (Burner Phone)
        # -------------------------------------------------------------
        for nid, data in g.nodes(data=True):
            if data.get("type") == EntityType.PHONE_NUMBER.value:
                # Find connected persons (inbound or outbound)
                connected_persons = []
                for nbr in set(list(g.predecessors(nid)) + list(g.successors(nid))):
                    nbr_data = g.nodes[nbr]
                    if nbr_data.get("type") == EntityType.PERSON.value:
                        connected_persons.append({
                            "id": str(nbr),
                            "name": nbr_data.get("name", str(nbr)),
                            "type": EntityType.PERSON.value
                        })

                if len(connected_persons) >= 2:
                    severity = AlertSeverity.CRITICAL if len(connected_persons) >= 3 else AlertSeverity.HIGH
                    alert = AlertRecord(
                        id=f"alt_burn_{uuid.uuid4().hex[:6]}",
                        rule_type=AlertRuleType.BURNER_PHONE,
                        severity=severity,
                        title=f"Shared Burner Phone: {data.get('name', nid)}",
                        description=(
                            f"Phone number {data.get('name', nid)} is shared across "
                            f"{len(connected_persons)} distinct criminal suspects ({', '.join(p['name'] for p in connected_persons)}). "
                            "Typical indicator of cartel communication or operational burner line."
                        ),
                        entities_involved=[{"id": str(nid), "name": data.get("name", nid), "type": EntityType.PHONE_NUMBER.value}] + connected_persons,
                        evidence=f"Call and contact graph records link {len(connected_persons)} persons to this single MSISDN.",
                        status=AlertStatus.NEW,
                        created_at=now
                    )
                    generated_alerts.append(alert)

        # -------------------------------------------------------------
        # Rule 2: Multiple suspects linked to same location (Safehouse)
        # -------------------------------------------------------------
        for nid, data in g.nodes(data=True):
            if data.get("type") == EntityType.LOCATION.value:
                linked_persons = []
                for nbr in set(list(g.predecessors(nid)) + list(g.successors(nid))):
                    nbr_data = g.nodes[nbr]
                    if nbr_data.get("type") == EntityType.PERSON.value:
                        linked_persons.append({
                            "id": str(nbr),
                            "name": nbr_data.get("name", str(nbr)),
                            "type": EntityType.PERSON.value
                        })

                if len(linked_persons) >= 2:
                    severity = AlertSeverity.CRITICAL if len(linked_persons) >= 4 else AlertSeverity.HIGH
                    alert = AlertRecord(
                        id=f"alt_loc_{uuid.uuid4().hex[:6]}",
                        rule_type=AlertRuleType.CO_LOCATION_CLUSTER,
                        severity=severity,
                        title=f"Co-Location Cluster at {data.get('name', nid)}",
                        description=(
                            f"Location '{data.get('name', nid)}' is frequented by {len(linked_persons)} "
                            f"flagged individuals ({', '.join(p['name'] for p in linked_persons)}). "
                            "High probability of safehouse, narcotics drop-zone, or planning venue."
                        ),
                        entities_involved=[{"id": str(nid), "name": data.get("name", nid), "type": EntityType.LOCATION.value}] + linked_persons,
                        evidence=f"Surveillance and travel records place {len(linked_persons)} suspects at this specific venue.",
                        status=AlertStatus.NEW,
                        created_at=now
                    )
                    generated_alerts.append(alert)

        # -------------------------------------------------------------
        # Rule 3: Unusual Relationship Density (Syndicate Cell)
        # -------------------------------------------------------------
        undirected = nx.Graph(g)
        if len(undirected) >= 4:
            for clique in nx.find_cliques(undirected):
                if len(clique) >= 3:
                    persons_in_clique = [
                        {"id": str(cid), "name": g.nodes[cid].get("name", str(cid)), "type": g.nodes[cid].get("type", "Entity")}
                        for cid in clique if g.nodes[cid].get("type") == EntityType.PERSON.value
                    ]
                    if len(persons_in_clique) >= 3:
                        alert = AlertRecord(
                            id=f"alt_dens_{uuid.uuid4().hex[:6]}",
                            rule_type=AlertRuleType.DENSE_SYNDICATE,
                            severity=AlertSeverity.CRITICAL,
                            title=f"Dense Criminal Cell Detected ({len(persons_in_clique)} Suspects)",
                            description=(
                                f"A tightly connected syndicate core was detected comprising "
                                f"{', '.join(p['name'] for p in persons_in_clique)}. "
                                "All members maintain cross-cutting calls, transactions, or shared ownership."
                            ),
                            entities_involved=persons_in_clique,
                            evidence="Clique analysis identified a fully meshed communication and transaction cluster.",
                            status=AlertStatus.NEW,
                            created_at=now
                        )
                        generated_alerts.append(alert)
                        break  # Report primary top clique

        # -------------------------------------------------------------
        # Rule 4: Repeated Flagged Interactions
        # -------------------------------------------------------------
        edge_pairs: Dict[tuple, List[str]] = {}
        for u, v, key, data in g.edges(keys=True, data=True):
            pair_key = tuple(sorted([str(u), str(v)]))
            edge_pairs.setdefault(pair_key, []).append(data.get("label", "LINK"))

        for (u, v), rels in edge_pairs.items():
            if len(rels) >= 2:
                u_data = g.nodes[u]
                v_data = g.nodes[v]
                if u_data.get("type") == EntityType.PERSON.value and v_data.get("type") == EntityType.PERSON.value:
                    alert = AlertRecord(
                        id=f"alt_rep_{uuid.uuid4().hex[:6]}",
                        rule_type=AlertRuleType.REPEATED_FLAGGED_INTERACTION,
                        severity=AlertSeverity.HIGH,
                        title=f"Repeated Operational Interactions: {u_data.get('name')} <-> {v_data.get('name')}",
                        description=(
                            f"Suspects {u_data.get('name')} and {v_data.get('name')} share multiple operational "
                            f"touchpoints: {', '.join(rels)}. Signals active coordination and high mutual trust."
                        ),
                        entities_involved=[
                            {"id": u, "name": u_data.get("name", u), "type": u_data.get("type")},
                            {"id": v, "name": v_data.get("name", v), "type": v_data.get("type")}
                        ],
                        evidence=f"Cross-channel interaction records: {', '.join(rels)}",
                        status=AlertStatus.NEW,
                        created_at=now
                    )
                    generated_alerts.append(alert)

        # Store or update alerts in MongoDB
        for alt in generated_alerts:
            existing = await mongo_client.alerts.find_one({"title": alt.title})
            if not existing:
                await mongo_client.alerts.insert_one(alt.model_dump())

        logger.info(f"Rule detection executed: {len(generated_alerts)} suspicious alerts flagged.")
        return generated_alerts

    async def get_alerts(
        self,
        severity: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 50
    ) -> List[AlertRecord]:
        filter_dict = {}
        if severity and severity.upper() != "ALL":
            filter_dict["severity"] = severity.upper()
        if status and status.upper() != "ALL":
            filter_dict["status"] = status.upper()

        cursor = mongo_client.alerts.find(filter_dict).sort("created_at", -1).limit(limit)
        docs = await cursor.to_list(length=limit)
        return [AlertRecord(**doc) for doc in docs]

    async def update_alert(self, alert_id: str, new_status: AlertStatus, notes: Optional[str] = None) -> Optional[AlertRecord]:
        now = datetime.now(timezone.utc)
        update_data = {"status": new_status.value, "updated_at": now}
        if notes:
            update_data["investigator_notes"] = notes

        res = await mongo_client.alerts.update_one({"id": alert_id}, {"$set": update_data})
        if res.modified_count or res.upserted_id:
            doc = await mongo_client.alerts.find_one({"id": alert_id})
            if doc:
                return AlertRecord(**doc)
        return None


alert_service = AlertService()


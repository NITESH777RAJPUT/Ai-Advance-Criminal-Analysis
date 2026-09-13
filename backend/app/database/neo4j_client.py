import asyncio
from typing import Any, Dict, List, Optional, Tuple
import networkx as nx
from neo4j import AsyncGraphDatabase, exceptions as neo4j_exceptions
from app.utils.config import settings
from app.utils.logger import get_logger

logger = get_logger("neo4j")


class Neo4jClient:
    def __init__(self):
        self.driver = None
        self.is_connected: bool = False
        # In-memory graph fallback
        self._nx_graph = nx.MultiDiGraph()
        self._node_metadata: Dict[str, Dict[str, Any]] = {}

    async def connect(self):
        try:
            logger.info(f"Attempting connection to Neo4j at {settings.NEO4J_URI}...")
            self.driver = AsyncGraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD)
            )
            # Verify connectivity with timeout
            await asyncio.wait_for(self.driver.verify_connectivity(), timeout=3.0)
            self.is_connected = True
            logger.info("Successfully connected to live Neo4j database!")
            await self._ensure_indices()
        except Exception as e:
            self.is_connected = False
            if self.driver:
                await self.driver.close()
                self.driver = None
            logger.warning(
                f"Neo4j live connection not available ({e}). "
                "Activating high-performance in-memory graph fallback (NetworkX)."
            )

    async def disconnect(self):
        if self.driver:
            await self.driver.close()
            self.is_connected = False
            logger.info("Neo4j connection closed.")

    async def _ensure_indices(self):
        if not self.is_connected or not self.driver:
            return
        try:
            async with self.driver.session() as session:
                labels = ["Person", "Location", "Vehicle", "PhoneNumber", "Organization"]
                for label in labels:
                    await session.run(
                        f"CREATE CONSTRAINT IF NOT EXISTS FOR (n:{label}) REQUIRE n.id IS UNIQUE"
                    )
        except Exception as e:
            logger.warning(f"Could not create Neo4j constraints: {e}")

    async def add_node(self, node_id: str, label: str, properties: Dict[str, Any]) -> Dict[str, Any]:
        """Add or update a node in graph."""
        clean_props = dict(properties)
        clean_props["id"] = node_id
        clean_props["type"] = label
        clean_props.setdefault("name", node_id)
        clean_props.setdefault("risk_score", 0.0)

        # Always update local memory graph
        self._nx_graph.add_node(node_id, **clean_props)
        self._node_metadata[node_id] = clean_props

        if self.is_connected and self.driver:
            try:
                query = (
                    f"MERGE (n:{label} {{id: $node_id}}) "
                    "SET n += $props "
                    "RETURN n"
                )
                async with self.driver.session() as session:
                    await session.run(query, node_id=node_id, props=clean_props)
            except Exception as e:
                logger.error(f"Failed to persist node {node_id} to Neo4j: {e}")

        return clean_props

    async def add_relationship(
        self,
        source_id: str,
        target_id: str,
        rel_type: str,
        properties: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Add a directed relationship between two nodes with multi-edge collision prevention."""
        props = properties or {}
        props["label"] = rel_type
        props["type"] = rel_type

        existing_matches = [
            k for u, v, k in self._nx_graph.edges(keys=True)
            if u == source_id and v == target_id and rel_type in str(k)
        ]
        edge_idx = len(existing_matches) + 1
        edge_key = f"{source_id}->{target_id}:{rel_type}:{edge_idx}"
        self._nx_graph.add_edge(source_id, target_id, key=edge_key, **props)

        if self.is_connected and self.driver:
            try:
                query = (
                    "MATCH (a {id: $source_id}) "
                    "MATCH (b {id: $target_id}) "
                    f"CREATE (a)-[r:{rel_type}]->(b) "
                    "SET r += $props "
                    "RETURN r"
                )
                async with self.driver.session() as session:
                    await session.run(query, source_id=source_id, target_id=target_id, props=props)
            except Exception as e:
                logger.error(f"Failed to persist relationship {edge_key} to Neo4j: {e}")

        return {"id": edge_key, "source": source_id, "target": target_id, "type": rel_type, "label": rel_type, "properties": props}

    async def get_network(
        self,
        node_types: Optional[List[str]] = None,
        rel_types: Optional[List[str]] = None,
        limit: int = 500
    ) -> Dict[str, Any]:
        """Fetch nodes and edges strictly validated and formatted for Cytoscape.js graph visualization."""
        if self.is_connected and self.driver:
            try:
                query_nodes = "MATCH (n) RETURN n LIMIT $limit"
                query_edges = "MATCH (n)-[r]->(m) RETURN n, r, m, type(r) as rel_type LIMIT $limit"
                async with self.driver.session() as session:
                    res_nodes = await session.run(query_nodes, limit=limit)
                    node_records = await res_nodes.data()

                    nodes_map = {}
                    for rec in node_records:
                        n = rec["n"]
                        nid = n.get("id")
                        if nid:
                            labels = list(n.labels) if hasattr(n, "labels") else [n.get("type", "Person")]
                            ntype = labels[0] if labels else n.get("type", "Person")
                            if node_types and ntype not in node_types:
                                continue
                            nodes_map[nid] = {
                                "id": nid,
                                "label": n.get("name", nid),
                                "type": ntype,
                                "risk_score": float(n.get("risk_score", 0.0)),
                                "influence_score": float(n.get("influence_score", 0.0)),
                                "community_id": str(n.get("community_id", "C-1")),
                                "connections_count": int(n.get("connections_count", 0)),
                                "properties": dict(n)
                            }

                    res_edges = await session.run(query_edges, limit=limit * 2)
                    edge_records = await res_edges.data()
                    edges_list = []
                    for idx, rec in enumerate(edge_records):
                        nid = rec["n"].get("id")
                        mid = rec["m"].get("id")
                        rel_type = rec["rel_type"]
                        r = rec["r"]
                        if nid in nodes_map and mid in nodes_map:
                            if rel_types and rel_type not in rel_types:
                                continue
                            edges_list.append({
                                "id": f"{nid}->{mid}:{rel_type}:{idx+1}",
                                "source": nid,
                                "target": mid,
                                "type": rel_type,
                                "label": rel_type,
                                "confidence": float(r.get("confidence", 1.0)),
                                "frequency": int(r.get("frequency", 1)),
                                "timestamp": r.get("timestamp") or r.get("created_at"),
                                "source_document": r.get("source_document") or r.get("case_id"),
                                "evidence": r.get("evidence"),
                                "properties": dict(r)
                            })
                            nodes_map[nid]["connections_count"] = nodes_map[nid].get("connections_count", 0) + 1
                            nodes_map[mid]["connections_count"] = nodes_map[mid].get("connections_count", 0) + 1

                    return {
                        "nodes": list(nodes_map.values()),
                        "edges": edges_list,
                        "stats": {"total_nodes": len(nodes_map), "total_edges": len(edges_list)}
                    }
            except Exception as e:
                logger.warning(f"Error querying Neo4j network: {e}. Falling back to in-memory graph.")

        # In-Memory NetworkX Graph response
        undirected = self._nx_graph.to_undirected()
        community_map = {}
        if len(undirected) > 0:
            try:
                communities_gen = nx.community.greedy_modularity_communities(undirected)
                for c_idx, c_nodes in enumerate(communities_gen):
                    c_name = f"C-{c_idx + 1}"
                    for n in c_nodes:
                        community_map[str(n)] = c_name
            except Exception:
                for c_idx, c_nodes in enumerate(nx.connected_components(undirected)):
                    c_name = f"C-{c_idx + 1}"
                    for n in c_nodes:
                        community_map[str(n)] = c_name

        max_deg = max([self._nx_graph.degree(n) for n in self._nx_graph.nodes()] or [1])
        nodes = []
        for n_id, data in self._nx_graph.nodes(data=True):
            ntype = data.get("type", "Person")
            if node_types and ntype not in node_types:
                continue
            degree = self._nx_graph.degree(n_id)
            influence = round(degree / max(1, max_deg), 3)
            cid = community_map.get(str(n_id), "C-1")
            nodes.append({
                "id": str(n_id),
                "label": data.get("name", str(n_id)),
                "type": ntype,
                "risk_score": float(data.get("risk_score", 0.0)),
                "influence_score": influence,
                "community_id": cid,
                "connections_count": degree,
                "properties": data
            })

        valid_node_ids = {n["id"] for n in nodes}
        edges = []
        edge_counter: Dict[str, int] = {}
        for u, v, key, data in self._nx_graph.edges(keys=True, data=True):
            u_str, v_str = str(u), str(v)
            if u_str in valid_node_ids and v_str in valid_node_ids:
                rtype = data.get("type") or data.get("label") or "ASSOCIATED_WITH"
                if rel_types and rtype not in rel_types:
                    continue
                pair_key = f"{u_str}->{v_str}:{rtype}"
                edge_counter[pair_key] = edge_counter.get(pair_key, 0) + 1
                unique_edge_id = str(key) if key and str(key).count(":") >= 2 else f"{pair_key}:{edge_counter[pair_key]}"
                edges.append({
                    "id": unique_edge_id,
                    "source": u_str,
                    "target": v_str,
                    "type": rtype,
                    "label": rtype,
                    "confidence": float(data.get("confidence", 1.0)),
                    "frequency": int(data.get("frequency", 1)),
                    "timestamp": data.get("timestamp") or data.get("created_at"),
                    "source_document": data.get("source_document") or data.get("case_id") or data.get("source_name"),
                    "evidence": data.get("evidence"),
                    "properties": data
                })

        return {
            "nodes": nodes[:limit],
            "edges": edges[:limit * 2],
            "stats": {"total_nodes": len(nodes), "total_edges": len(edges)}
        }

    async def get_person_subgraph(self, person_id: str, depth: int = 2) -> Dict[str, Any]:
        """Fetch 1 or 2-hop neighborhood of an entity."""
        if person_id not in self._nx_graph:
            return {"nodes": [], "edges": [], "stats": {"found": False}}

        # Ego graph around entity
        undirected = self._nx_graph.to_undirected()
        ego_nodes = nx.single_source_shortest_path_length(undirected, person_id, cutoff=depth).keys()

        nodes = []
        for nid in ego_nodes:
            data = self._nx_graph.nodes[nid]
            nodes.append({
                "id": str(nid),
                "label": data.get("name", str(nid)),
                "type": data.get("type", "Entity"),
                "risk_score": float(data.get("risk_score", 0.0)),
                "connections_count": self._nx_graph.degree(nid),
                "properties": data
            })

        edges = []
        ego_set = set(ego_nodes)
        for u, v, key, data in self._nx_graph.edges(keys=True, data=True):
            if u in ego_set and v in ego_set:
                edges.append({
                    "id": str(key),
                    "source": str(u),
                    "target": str(v),
                    "label": data.get("label", "ASSOCIATED_WITH"),
                    "evidence": data.get("evidence"),
                    "properties": data
                })

        return {
            "nodes": nodes,
            "edges": edges,
            "stats": {"center_id": person_id, "subgraph_size": len(nodes)}
        }

    async def find_shortest_path(self, source_id: str, target_id: str) -> Dict[str, Any]:
        """Find the shortest connection path between two criminal entities."""
        if source_id not in self._nx_graph or target_id not in self._nx_graph:
            return {"found": False, "path": [], "length": -1, "edges": []}

        try:
            undirected = self._nx_graph.to_undirected()
            path_nodes = nx.shortest_path(undirected, source=source_id, target=target_id)

            path_details = []
            edges_details = []
            for i, nid in enumerate(path_nodes):
                data = self._nx_graph.nodes[nid]
                path_details.append({
                    "id": str(nid),
                    "label": data.get("name", str(nid)),
                    "type": data.get("type", "Entity"),
                    "risk_score": float(data.get("risk_score", 0.0))
                })
                if i < len(path_nodes) - 1:
                    u, v = path_nodes[i], path_nodes[i+1]
                    # Find edge in original graph (either direction)
                    edge_found = None
                    if self._nx_graph.has_edge(u, v):
                        edge_dict = self._nx_graph.get_edge_data(u, v)
                        first_key = next(iter(edge_dict))
                        edge_found = edge_dict[first_key]
                        edge_found["source"] = u
                        edge_found["target"] = v
                    elif self._nx_graph.has_edge(v, u):
                        edge_dict = self._nx_graph.get_edge_data(v, u)
                        first_key = next(iter(edge_dict))
                        edge_found = edge_dict[first_key]
                        edge_found["source"] = v
                        edge_found["target"] = u

                    if edge_found:
                        edges_details.append({
                            "source": str(edge_found["source"]),
                            "target": str(edge_found["target"]),
                            "label": edge_found.get("label", "ASSOCIATED_WITH")
                        })

            return {
                "found": True,
                "path": path_details,
                "length": len(path_nodes) - 1,
                "edges": edges_details
            }
        except nx.NetworkXNoPath:
            return {"found": False, "path": [], "length": -1, "edges": []}

    def get_raw_graph(self) -> nx.MultiDiGraph:
        return self._nx_graph

    async def clear_all(self):
        self._nx_graph.clear()
        self._node_metadata.clear()
        if self.is_connected and self.driver:
            try:
                async with self.driver.session() as session:
                    await session.run("MATCH (n) DETACH DELETE n")
            except Exception as e:
                logger.error(f"Failed to clear Neo4j: {e}")


neo4j_client = Neo4jClient()


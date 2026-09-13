from typing import Any, Dict, List, Optional, Tuple
import networkx as nx
from app.database.neo4j_client import neo4j_client
from app.models.schemas import EntityType
from app.utils.logger import get_logger

logger = get_logger("network_analysis")


class NetworkAnalysisService:
    @staticmethod
    def get_graph() -> nx.MultiDiGraph:
        return neo4j_client.get_raw_graph()

    def get_centrality_metrics(self) -> Dict[str, Any]:
        """Calculates degree, betweenness, and closeness centralities."""
        g = self.get_graph()
        if len(g) == 0:
            return {"degree": {}, "betweenness": {}, "closeness": {}}

        # Convert to simple graph for standard betweenness/closeness
        undirected = nx.Graph(g)

        degree_cent = nx.degree_centrality(g)
        betweenness_cent = nx.betweenness_centrality(undirected) if len(undirected) > 1 else {n: 0.0 for n in undirected}
        closeness_cent = nx.closeness_centrality(undirected) if len(undirected) > 1 else {n: 0.0 for n in undirected}

        return {
            "degree": {k: round(v, 4) for k, v in degree_cent.items()},
            "betweenness": {k: round(v, 4) for k, v in betweenness_cent.items()},
            "closeness": {k: round(v, 4) for k, v in closeness_cent.items()}
        }

    def detect_most_connected(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Identifies top connected individuals/facilitators."""
        g = self.get_graph()
        suspects = []

        for nid, data in g.nodes(data=True):
            # focus on persons or high-degree entities
            ntype = data.get("type", "Person")
            degree = g.degree(nid)
            in_degree = g.in_degree(nid)
            out_degree = g.out_degree(nid)

            suspects.append({
                "id": str(nid),
                "name": data.get("name", str(nid)),
                "type": ntype,
                "degree": degree,
                "in_degree": in_degree,
                "out_degree": out_degree,
                "risk_score": float(data.get("risk_score", 0.0)),
                "properties": data
            })

        suspects.sort(key=lambda x: x["degree"], reverse=True)
        return suspects[:limit]

    def discover_hidden_relationships(self, min_shared: int = 1) -> List[Dict[str, Any]]:
        """
        Detects unlinked pairs who share mutual associates, locations, or burner phones.
        Infers covert coordination between criminal cells.
        """
        g = self.get_graph()
        undirected = nx.Graph(g)
        nodes = list(undirected.nodes())
        hidden_links = []

        for i in range(len(nodes)):
            for j in range(i + 1, len(nodes)):
                u, v = nodes[i], nodes[j]
                if undirected.has_edge(u, v):
                    continue  # already directly linked

                u_nbrs = set(undirected.neighbors(u))
                v_nbrs = set(undirected.neighbors(v))
                shared = u_nbrs.intersection(v_nbrs)

                if len(shared) >= min_shared:
                    u_data = g.nodes[u]
                    v_data = g.nodes[v]
                    shared_names = [g.nodes[nbr].get("name", str(nbr)) for nbr in shared]

                    hidden_links.append({
                        "source": {"id": str(u), "name": u_data.get("name", str(u)), "type": u_data.get("type")},
                        "target": {"id": str(v), "name": v_data.get("name", str(v)), "type": v_data.get("type")},
                        "shared_count": len(shared),
                        "shared_entities": shared_names,
                        "inference": f"Indirectly connected via {len(shared)} common link(s): {', '.join(shared_names[:3])}"
                    })

        hidden_links.sort(key=lambda x: x["shared_count"], reverse=True)
        return hidden_links[:20]

    def detect_communities(self) -> List[Dict[str, Any]]:
        """Segments graph into syndicate clusters / sub-cells."""
        g = self.get_graph()
        undirected = nx.Graph(g)
        if len(undirected) == 0:
            return []

        try:
            communities_gen = nx.community.greedy_modularity_communities(undirected)
            communities = []
            for idx, c_set in enumerate(communities_gen):
                members = []
                for nid in c_set:
                    data = g.nodes[nid]
                    members.append({
                        "id": str(nid),
                        "name": data.get("name", str(nid)),
                        "type": data.get("type", "Entity"),
                        "risk_score": float(data.get("risk_score", 0.0))
                    })
                communities.append({
                    "cluster_id": f"Cell-{idx + 1}",
                    "size": len(members),
                    "members": members
                })
            return sorted(communities, key=lambda x: x["size"], reverse=True)
        except Exception as e:
            logger.warning(f"Community detection error: {e}")
            return []

    def compute_risk_scores(self) -> Dict[str, float]:
        """
        Computes composite risk score (0 to 100) for all entities based on:
        - Degree centrality (connectivity)
        - Betweenness centrality (brokerage role)
        - Density of associated persons
        """
        g = self.get_graph()
        if len(g) == 0:
            return {}

        metrics = self.get_centrality_metrics()
        deg_map = metrics["degree"]
        bet_map = metrics["betweenness"]

        scores = {}
        for nid, data in g.nodes(data=True):
            deg_norm = deg_map.get(nid, 0.0) * 100
            bet_norm = bet_map.get(nid, 0.0) * 100

            # Base score from graph structure
            raw_score = (deg_norm * 0.45) + (bet_norm * 0.40) + (g.degree(nid) * 5)
            # Bound score between 10 and 98 for suspects
            if data.get("type") == EntityType.PERSON.value:
                final_score = min(max(round(raw_score + 25, 1), 15.0), 98.0)
            else:
                final_score = min(max(round(raw_score + 10, 1), 5.0), 90.0)

            scores[nid] = final_score
            # Update in graph metadata
            g.nodes[nid]["risk_score"] = final_score

        return scores


network_analysis = NetworkAnalysisService()


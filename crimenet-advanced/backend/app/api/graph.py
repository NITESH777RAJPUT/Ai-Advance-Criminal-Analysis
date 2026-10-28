from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from app.database.neo4j_client import neo4j_client
from app.models.schemas import NetworkGraphResponse, UserResponse
from app.services.auth_service import get_current_user
from app.services.graph_service import graph_service
from app.services.network_analysis import network_analysis

router = APIRouter(prefix="/graph", tags=["Graph & Network Analysis"])


@router.get("/network", response_model=NetworkGraphResponse)
async def get_network_graph(
    node_types: Optional[List[str]] = Query(None, description="Filter node types"),
    rel_types: Optional[List[str]] = Query(None, description="Filter relationship types"),
    limit: int = Query(250, ge=10, le=1000),
    current_user: UserResponse = Depends(get_current_user)
):
    """Retrieve criminal network nodes and relationships formatted for React Flow graph visualization."""
    return await graph_service.get_network(node_types=node_types, rel_types=rel_types, limit=limit)


@router.get("/person/{person_id}")
async def get_person_subgraph(
    person_id: str,
    depth: int = Query(2, ge=1, le=4),
    current_user: UserResponse = Depends(get_current_user)
):
    """Retrieve 1-hop or 2-hop neighborhood surrounding a specific suspect or entity."""
    res = await neo4j_client.get_person_subgraph(person_id=person_id, depth=depth)
    if not res.get("nodes"):
        raise HTTPException(status_code=404, detail=f"No graph neighborhood found for '{person_id}'.")
    return res


@router.get("/path")
async def find_connection_path(
    source_id: str = Query(..., description="Starting entity ID"),
    target_id: str = Query(..., description="Target entity ID"),
    current_user: UserResponse = Depends(get_current_user)
):
    """Find the shortest connection path connecting two suspects through intermediaries or burner phones."""
    return await neo4j_client.find_shortest_path(source_id=source_id, target_id=target_id)


@router.get("/analysis")
async def get_network_analysis(current_user: UserResponse = Depends(get_current_user)):
    """Deep graph intelligence: centrality scores, hidden connections, community clusters, and top hubs."""
    centrality = network_analysis.get_centrality_metrics()
    most_connected = network_analysis.detect_most_connected(limit=10)
    hidden_links = network_analysis.discover_hidden_relationships(min_shared=1)
    communities = network_analysis.detect_communities()

    return {
        "centrality": centrality,
        "most_connected": most_connected,
        "hidden_links": hidden_links,
        "communities": communities
    }


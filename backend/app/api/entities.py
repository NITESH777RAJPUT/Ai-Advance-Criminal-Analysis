from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from app.models.schemas import ExtractedEntity, UserResponse
from app.services.auth_service import get_current_user, require_investigator
from app.services.graph_service import graph_service
from app.services.network_analysis import network_analysis

router = APIRouter(prefix="/entities", tags=["Entities & Profiles"])


@router.get("")
async def list_entities(
    query: Optional[str] = Query(None, description="Search term for entity name or ID"),
    type: Optional[str] = Query(None, description="Filter by entity type (Person, Location, Vehicle, PhoneNumber, Organization)"),
    min_risk: float = Query(0.0, ge=0.0, le=100.0, description="Minimum risk score"),
    limit: int = Query(50, ge=1, le=200),
    current_user: UserResponse = Depends(get_current_user)
):
    """Search and filter entities across the criminal network."""
    return await graph_service.search_entities(
        query=query,
        entity_type=type,
        min_risk=min_risk,
        limit=limit
    )


@router.get("/{entity_id}")
async def get_entity_profile(
    entity_id: str,
    current_user: UserResponse = Depends(get_current_user)
):
    """Retrieve detailed criminal profile, risk score, and connected associates."""
    profile = await graph_service.get_person_details(entity_id)
    if not profile:
        raise HTTPException(status_code=404, detail=f"Entity '{entity_id}' not found.")
    return profile


@router.post("")
async def create_or_update_entity(
    entity: ExtractedEntity,
    current_user: UserResponse = Depends(require_investigator)
):
    """Manually add or update an intelligence entity in the graph."""
    from app.database.neo4j_client import neo4j_client
    node_id = entity.id or f"{entity.type.value[:4].lower()}_{entity.name.lower().replace(' ', '_')}"
    props = {
        "name": entity.name,
        "type": entity.type.value,
        "risk_score": entity.risk_score,
        "confidence": entity.confidence
    }
    props.update(entity.metadata)
    res = await neo4j_client.add_node(node_id=node_id, label=entity.type.value, properties=props)
    network_analysis.compute_risk_scores()
    return {"message": "Entity registered successfully", "entity": res}


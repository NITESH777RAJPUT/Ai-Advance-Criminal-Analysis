from typing import Any, Dict
from fastapi import APIRouter, Depends
from app.database.mongodb import mongo_client
from app.database.neo4j_client import neo4j_client
from app.models.schemas import DashboardStats, EntityType, UserResponse
from app.services.alert_service import alert_service
from app.services.auth_service import get_current_user
from app.services.network_analysis import network_analysis

router = APIRouter(prefix="/dashboard", tags=["Dashboard Intelligence"])


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_statistics(current_user: UserResponse = Depends(get_current_user)):
    """Computes comprehensive dashboard metrics across the intelligence graph and MongoDB."""
    g = neo4j_client.get_raw_graph()

    total_persons = sum(1 for _, d in g.nodes(data=True) if d.get("type") == EntityType.PERSON.value)
    total_locations = sum(1 for _, d in g.nodes(data=True) if d.get("type") == EntityType.LOCATION.value)
    total_vehicles = sum(1 for _, d in g.nodes(data=True) if d.get("type") == EntityType.VEHICLE.value)
    total_phones = sum(1 for _, d in g.nodes(data=True) if d.get("type") == EntityType.PHONE_NUMBER.value)
    total_relationships = g.number_of_edges()

    total_alerts = await mongo_client.alerts.count_documents({})
    total_cases = await mongo_client.uploads.count_documents({})

    # Risk Distribution
    risk_distribution = {"Critical (>=70)": 0, "High (50-69)": 0, "Medium (30-49)": 0, "Low (<30)": 0}
    for _, d in g.nodes(data=True):
        risk = float(d.get("risk_score", 0.0))
        if risk >= 70:
            risk_distribution["Critical (>=70)"] += 1
        elif risk >= 50:
            risk_distribution["High (50-69)"] += 1
        elif risk >= 30:
            risk_distribution["Medium (30-49)"] += 1
        else:
            risk_distribution["Low (<30)"] += 1

    # Top high risk suspects
    top_suspects = network_analysis.detect_most_connected(limit=5)

    # Recent alerts
    recent_alerts = await alert_service.get_alerts(limit=5)

    return DashboardStats(
        total_persons=total_persons,
        total_relationships=total_relationships,
        total_alerts=total_alerts,
        total_locations=total_locations,
        total_vehicles=total_vehicles,
        total_phones=total_phones,
        total_cases=total_cases,
        risk_distribution=risk_distribution,
        recent_alerts=recent_alerts,
        top_suspects=top_suspects,
        database_status={
            "mongodb_connected": mongo_client.is_connected,
            "neo4j_connected": neo4j_client.is_connected
        }
    )

import pytest
import asyncio
from app.services.nlp_service import nlp_service
from app.models.schemas import EntityType, RelationshipType, UserLogin, UserCreate, UserRole
from app.services.auth_service import AuthService, get_password_hash, verify_password
from app.database.neo4j_client import neo4j_client
from app.services.network_analysis import network_analysis
from app.services.alert_service import alert_service
from app.services.report_service import report_service
from app.models.schemas import ReportGenerateRequest


def test_spacy_nlp_extraction():
    """Verify requirements example: 'Rahul called Aman from Pune.'"""
    text = "Rahul called Aman from Pune."
    result = nlp_service.process_text(text)
    
    entity_names = [e.name for e in result.entities]
    assert "Rahul" in entity_names
    assert "Aman" in entity_names
    assert "Pune" in entity_names

    # Check relation
    called_rels = [r for r in result.relationships if r.relationship_type == RelationshipType.CALLED]
    assert len(called_rels) >= 1
    assert called_rels[0].source == "Rahul"
    assert called_rels[0].target == "Aman"


def test_password_hashing():
    pw = "SecretPass123"
    hashed = get_password_hash(pw)
    assert verify_password(pw, hashed)
    assert not verify_password("WrongPass", hashed)


@pytest.mark.asyncio
async def test_graph_and_alerts():
    # Clear graph and seed mini syndicate
    await neo4j_client.clear_all()
    
    # Add nodes
    await neo4j_client.add_node("p1", EntityType.PERSON.value, {"name": "Suspect A"})
    await neo4j_client.add_node("p2", EntityType.PERSON.value, {"name": "Suspect B"})
    await neo4j_client.add_node("p3", EntityType.PERSON.value, {"name": "Suspect C"})
    await neo4j_client.add_node("ph1", EntityType.PHONE_NUMBER.value, {"name": "+919999900001"})
    await neo4j_client.add_node("loc1", EntityType.LOCATION.value, {"name": "Hideout Alpha"})

    # Shared burner phone (p1, p2 both call ph1)
    await neo4j_client.add_relationship("p1", "ph1", RelationshipType.OWNS.value)
    await neo4j_client.add_relationship("p2", "ph1", RelationshipType.CALLED.value)

    # Safehouse (p1, p2, p3 all visit loc1)
    await neo4j_client.add_relationship("p1", "loc1", RelationshipType.VISITED.value)
    await neo4j_client.add_relationship("p2", "loc1", RelationshipType.VISITED.value)

    # P1 calls P2
    await neo4j_client.add_relationship("p1", "p2", RelationshipType.CALLED.value)

    # Shortest path
    path_res = await neo4j_client.find_shortest_path("p1", "p2")
    assert path_res["found"] is True
    assert path_res["length"] == 1

    # Network analysis
    risk_scores = network_analysis.compute_risk_scores()
    assert "p1" in risk_scores
    assert risk_scores["p1"] > 0

    # Alerts detection
    alerts = await alert_service.run_detection()
    rule_types = [a.rule_type.value for a in alerts]
    assert "BURNER_PHONE" in rule_types or "CO_LOCATION_CLUSTER" in rule_types


@pytest.mark.asyncio
async def test_pdf_report_generation():
    req = ReportGenerateRequest(
        suspect_id="p1",
        case_title="Test Unit Case",
        notes="Urgent arrest warrant required."
    )
    pdf_bytes = await report_service.generate_suspect_pdf(req, generated_by="Inspector Test")
    assert len(pdf_bytes) > 500
    assert pdf_bytes.startswith(b"%PDF")


import asyncio
from datetime import datetime, timezone
from app.database.mongodb import mongo_client
from app.database.neo4j_client import neo4j_client
from app.models.schemas import EntityType, RelationshipType
from app.services.alert_service import alert_service
from app.services.network_analysis import network_analysis
from app.utils.logger import get_logger

logger = get_logger("seed_data")


async def seed_complete_syndicate():
    """Seeds a realistic criminal intelligence syndicate network."""
    logger.info("Starting Syndicate Intelligence graph seeding...")

    # Nodes Definitions
    nodes = [
        # Persons
        ("per_rahul_sharma", "Rahul Sharma", EntityType.PERSON.value, {"aliases": ["RS", "The Architect"], "risk_score": 92.0, "status": "Prime Suspect", "role": "Syndicate Kingpin"}),
        ("per_aman_verma", "Aman Verma", EntityType.PERSON.value, {"aliases": ["AV"], "risk_score": 85.0, "status": "Suspect", "role": "Logistics Coordinator"}),
        ("per_vikram_malhotra", "Vikram Malhotra", EntityType.PERSON.value, {"aliases": ["Vicky"], "risk_score": 88.0, "status": "Suspect", "role": "Financial & Hawala Broker"}),
        ("per_sameer_khan", "Sameer Khan", EntityType.PERSON.value, {"aliases": ["Sam"], "risk_score": 79.0, "status": "Suspect", "role": "Operations & Enforcement"}),
        ("per_devendra_joshi", "Devendra Joshi", EntityType.PERSON.value, {"aliases": ["DJ"], "risk_score": 64.0, "status": "Under Surveillance", "role": "Courier"}),
        ("per_priya_nair", "Priya Nair", EntityType.PERSON.value, {"aliases": ["Accountant"], "risk_score": 58.0, "status": "Person of Interest", "role": "Shell Corp Director"}),
        ("per_rohan_mehta", "Rohan Mehta", EntityType.PERSON.value, {"aliases": ["Caretaker"], "risk_score": 45.0, "status": "Associate", "role": "Safehouse Manager"}),
        ("per_ananya_roy", "Ananya Roy", EntityType.PERSON.value, {"aliases": ["Dubai Contact"], "risk_score": 62.0, "status": "Foreign Contact", "role": "Cross-border Mule"}),

        # Locations
        ("loc_pune_safehouse", "Pune Safehouse (Sector 4)", EntityType.LOCATION.value, {"city": "Pune", "type": "Safehouse", "surveillance_status": "Monitored"}),
        ("loc_mumbai_docks", "Mumbai Docks Cargo Terminal", EntityType.LOCATION.value, {"city": "Mumbai", "type": "Transit Hub", "surveillance_status": "Flagged"}),
        ("loc_goa_villa", "North Goa Beachside Villa", EntityType.LOCATION.value, {"city": "Goa", "type": "Meeting Venue", "surveillance_status": "Periodic Check"}),
        ("loc_dubai_office", "Dubai Financial Centre Office 402", EntityType.LOCATION.value, {"city": "Dubai", "type": "Foreign Front", "surveillance_status": "Interpol Red Notice"}),
        ("loc_delhi_hub", "Delhi Karol Bagh Warehousing", EntityType.LOCATION.value, {"city": "Delhi", "type": "Distribution Node", "surveillance_status": "Active"}),

        # Vehicles
        ("veh_black_suv", "Black SUV (MH-12-AB-9876)", EntityType.VEHICLE.value, {"make": "Mahindra Scorpio", "color": "Black", "registration": "MH-12-AB-9876"}),
        ("veh_white_sedan", "White Sedan (MH-01-CD-4321)", EntityType.VEHICLE.value, {"make": "Honda City", "color": "White", "registration": "MH-01-CD-4321"}),
        ("veh_dark_van", "Dark Delivery Van (DL-03-EF-5544)", EntityType.VEHICLE.value, {"make": "Tata Winger", "color": "Dark Grey", "registration": "DL-03-EF-5544"}),

        # Phone Numbers
        ("ph_burner_01", "+91-98765-01001 (Burner Alpha)", EntityType.PHONE_NUMBER.value, {"provider": "Airtel Prepaid", "imei_swaps": 4, "is_burner": True}),
        ("ph_burner_02", "+91-98765-02002 (Burner Bravo)", EntityType.PHONE_NUMBER.value, {"provider": "Jio Prepaid", "imei_swaps": 2, "is_burner": True}),
        ("ph_enforcer_line", "+91-98765-03003 (Direct Line)", EntityType.PHONE_NUMBER.value, {"provider": "Vodafone", "imei_swaps": 1, "is_burner": False}),

        # Organizations
        ("org_shadownet", "ShadowNet Logistics Pvt Ltd", EntityType.ORGANIZATION.value, {"registration": "CIN-U72200PN2023PTC19", "classification": "Front Company"}),
        ("org_apex_consultancy", "Apex Financial Advisory", EntityType.ORGANIZATION.value, {"registration": "LLP-2022-MUM", "classification": "Shell Entity"}),
    ]

    for nid, label, entity_type, props in nodes:
        props_to_save = dict(props)
        props_to_save["name"] = label
        await neo4j_client.add_node(node_id=nid, label=entity_type, properties=props_to_save)

    # Relationships Definitions
    relationships = [
        # Syndicate core communication
        ("per_rahul_sharma", "per_aman_verma", RelationshipType.CALLED.value, {"evidence": "CDR wiretap logs: 48 calls recorded during operation window."}),
        ("per_rahul_sharma", "per_vikram_malhotra", RelationshipType.TRANSACTED_WITH.value, {"evidence": "Hawala ledger recovered during raid records INR 2.4 Crore transfer."}),
        ("per_rahul_sharma", "per_vikram_malhotra", RelationshipType.CALLED.value, {"evidence": "Encrypted VoIP logs match phone registration."}),
        ("per_aman_verma", "per_vikram_malhotra", RelationshipType.ASSOCIATED_WITH.value, {"evidence": "Surveillance footage of private meeting in Goa."}),

        # Co-location Safehouse Cluster (Rahul, Aman, Vikram all visited Pune Safehouse)
        ("per_rahul_sharma", "loc_pune_safehouse", RelationshipType.VISITED.value, {"evidence": "Cell tower triangulation confirms presence on June 12."}),
        ("per_aman_verma", "loc_pune_safehouse", RelationshipType.VISITED.value, {"evidence": "CCTV camera footage at compound gate."}),
        ("per_vikram_malhotra", "loc_pune_safehouse", RelationshipType.VISITED.value, {"evidence": "Vehicle ANPR logs match arrival time."}),
        ("per_rohan_mehta", "loc_pune_safehouse", RelationshipType.LOCATED_AT.value, {"evidence": "Property lease agreement registered under Rohan Mehta."}),

        # Burner Phone Links (Rahul, Aman, Vikram all linked to Burner Alpha)
        ("per_rahul_sharma", "ph_burner_01", RelationshipType.OWNS.value, {"evidence": "Prepaid SIM purchased using forged Aadhaar card linked to Rahul."}),
        ("per_aman_verma", "ph_burner_01", RelationshipType.CALLED.value, {"evidence": "Outbound call logs show repeated 2 AM check-in calls."}),
        ("per_vikram_malhotra", "ph_burner_01", RelationshipType.CALLED.value, {"evidence": "Call record link confirmed through IMSI catcher surveillance."}),

        # Operations & Logistics
        ("per_sameer_khan", "per_rahul_sharma", RelationshipType.ASSOCIATED_WITH.value, {"evidence": "Witness testimony places Sameer as direct security escort."}),
        ("per_sameer_khan", "veh_black_suv", RelationshipType.OWNS.value, {"evidence": "Traffic violation challan issued to Sameer Khan driving this vehicle."}),
        ("per_rahul_sharma", "veh_black_suv", RelationshipType.OWNS.value, {"evidence": "RC book registration registered under ShadowNet Logistics."}),
        ("per_sameer_khan", "ph_enforcer_line", RelationshipType.OWNS.value, {"evidence": "Subscriber registration verified."}),
        ("per_sameer_khan", "loc_goa_villa", RelationshipType.VISITED.value, {"evidence": "Hotel check-in register dated August 14."}),
        ("per_vikram_malhotra", "loc_goa_villa", RelationshipType.VISITED.value, {"evidence": "Flight boarding pass to Goa matches same weekend."}),

        # Hawala & Financial Pipeline
        ("per_devendra_joshi", "per_aman_verma", RelationshipType.ASSOCIATED_WITH.value, {"evidence": "Caught carrying cash couriers between Pune and Mumbai."}),
        ("per_devendra_joshi", "ph_burner_02", RelationshipType.OWNS.value, {"evidence": "Physical phone seized during field interception."}),
        ("per_aman_verma", "ph_burner_02", RelationshipType.CALLED.value, {"evidence": "Repeated coordination calls prior to cash drop."}),
        ("per_devendra_joshi", "per_priya_nair", RelationshipType.TRANSACTED_WITH.value, {"evidence": "Bank deposit slips match Hawala batch numbers."}),
        ("per_priya_nair", "org_apex_consultancy", RelationshipType.WORKS_FOR.value, {"evidence": "Listed as managing director in corporate filing."}),
        ("org_apex_consultancy", "loc_mumbai_docks", RelationshipType.LOCATED_AT.value, {"evidence": "Lease contract at Navi Mumbai free trade zone."}),

        # Organizations
        ("per_rahul_sharma", "org_shadownet", RelationshipType.WORKS_FOR.value, {"evidence": "Ultimate beneficial owner (UBO) declaration."}),
        ("org_shadownet", "loc_pune_safehouse", RelationshipType.LOCATED_AT.value, {"evidence": "Corporate warehouse address."}),

        # Cross border / Dubai link
        ("per_ananya_roy", "per_rahul_sharma", RelationshipType.TRANSACTED_WITH.value, {"evidence": "Swift wire transfer via correspondent bank in UAE."}),
        ("per_ananya_roy", "loc_dubai_office", RelationshipType.LOCATED_AT.value, {"evidence": "Employment visa stamped in Dubai."}),

        # Additional logistical node
        ("per_aman_verma", "veh_white_sedan", RelationshipType.OWNS.value, {"evidence": "Toll plaza FASTag transaction records on Mumbai-Pune Expressway."}),
        ("per_rohan_mehta", "per_aman_verma", RelationshipType.ASSOCIATED_WITH.value, {"evidence": "Frequent WhatsApp encrypted messages."}),
    ]

    for src, tgt, rel_type, props in relationships:
        await neo4j_client.add_relationship(source_id=src, target_id=tgt, rel_type=rel_type, properties=props)

    # Compute network analytics and trigger suspicious pattern rules
    network_analysis.compute_risk_scores()
    alerts = await alert_service.run_detection()

    # Create initial case record in MongoDB
    initial_case = {
        "id": "case_shadow_001",
        "title": "Operation ShadowNet: Inter-State Narcotics & Cyber-Hawala Ring",
        "file_type": "json",
        "file_name": "operation_shadownet_initial_dossier.json",
        "cloudinary_url": None,
        "entities_count": len(nodes),
        "relationships_count": len(relationships),
        "uploaded_by": "Director Admin",
        "uploaded_at": datetime.now(timezone.utc),
        "summary": (
            f"Comprehensive intelligence graph seeded with {len(nodes)} strategic entities and "
            f"{len(relationships)} multi-channel relationships. Detected {len(alerts)} suspicious pattern alerts."
        )
    }
    await mongo_client.uploads.insert_one(initial_case)

    logger.info(f"Syndicate seeding complete! {len(nodes)} nodes, {len(relationships)} edges, {len(alerts)} alerts.")
    return len(nodes) + len(relationships)


if __name__ == "__main__":
    asyncio.run(seed_complete_syndicate())


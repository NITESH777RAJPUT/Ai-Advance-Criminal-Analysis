import pytest
from app.services.nlp_service import nlp_service
from app.models.schemas import EntityType, RelationshipType


def test_extraction_provenance_and_snippets():
    text = "Rahul called Aman from Pune regarding the shipment. Contact number is +919876501001."
    result = nlp_service.process_text(text)

    # 1. Verify entities exist
    ent_map = {e.name: e for e in result.entities}
    assert "Rahul" in ent_map
    assert "Pune" in ent_map

    # 2. Verify source provenance offsets and methods
    rahul = ent_map["Rahul"]
    assert rahul.start_char is not None
    assert rahul.end_char is not None
    assert rahul.source_snippet is not None
    assert "spacy" in rahul.extraction_method or "linguistic" in rahul.extraction_method

    # 3. Verify phone regex provenance
    phone_ents = [e for e in result.entities if e.type == EntityType.PHONE_NUMBER]
    assert len(phone_ents) >= 1
    phone = phone_ents[0]
    assert phone.extraction_method == "regex_phone"
    assert phone.start_char is not None
    assert phone.end_char is not None
    assert "+919876501001" in text[phone.start_char:phone.end_char]

    # 4. Verify relationship provenance
    called_rels = [r for r in result.relationships if r.relationship_type == RelationshipType.CALLED]
    assert len(called_rels) >= 1
    rel = called_rels[0]
    assert rel.source_snippet is not None
    assert "dep_relation" in rel.extraction_method

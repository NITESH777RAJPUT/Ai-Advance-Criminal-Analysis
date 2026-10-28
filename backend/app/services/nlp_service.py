import re
import uuid
from typing import Dict, List, Optional, Set, Tuple
import spacy
from spacy.tokens import Doc
from app.models.schemas import (
    EntityType,
    ExtractedEntity,
    ExtractedRelationship,
    ExtractionResult,
    RelationshipType,
)
from app.utils.logger import get_logger

logger = get_logger("nlp_service")

# Regex patterns
PHONE_REGEX = re.compile(
    r'(?:(?:\+|00)[1-9]\d{0,2}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?[6-9]\d{3}[-.\s]?\d{4,6}\b|'
    r'\b(?:\+?1[-.\s]?)?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'
)

VEHICLE_REGEX = re.compile(
    r'\b([A-Z]{2}[-\s]?[0-9]{1,2}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{4})\b|'
    r'\b(?:black|white|silver|red|blue|grey|dark)?\s*(?:sedan|suv|truck|van|motorcycle|bmw|mercedes|audi|toyota|honda|ford|tata|hyundai|mahindra)\s*(?:[A-Z0-9\-]+)?\b',
    re.IGNORECASE
)

# Relationship keywords mapping
RELATION_VERBS = {
    RelationshipType.CALLED: ["call", "called", "dial", "dialed", "contact", "contacted", "phone", "phoned", "spoke", "speaks", "messaged", "texted"],
    RelationshipType.VISITED: ["visit", "visited", "travel", "traveled", "went", "arrived", "stay", "stayed", "fled", "flew", "seen", "spotted", "hide", "hid"],
    RelationshipType.OWNS: ["own", "owns", "owned", "drive", "drove", "drives", "registered", "purchased", "bought", "possesses", "has"],
    RelationshipType.TRANSACTED_WITH: ["transact", "transacted", "pay", "paid", "transfer", "transferred", "wire", "wired", "sent money", "received money", "funded", "bribed"],
    RelationshipType.WORKS_FOR: ["work", "works", "worked", "employed", "leads", "runs", "member", "commands", "reports to"],
    RelationshipType.LOCATED_AT: ["located", "based", "headquartered", "situated", "resides"],
    RelationshipType.ASSOCIATED_WITH: ["associate", "associated", "meet", "met", "partner", "accomplice", "conspired", "collaborated", "linked", "connected"]
}

# Common non-person words that might be PROPN or capitalized at sentence start
STOP_PROPN = {
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "january", "february", "march", "april", "may", "june", "july", "august",
    "september", "october", "november", "december", "the", "an", "this", "that",
    "in", "at", "on", "fir", "police", "inspector", "officer", "report", "case"
}


class NLPService:
    def __init__(self):
        try:
            self.nlp = spacy.load("en_core_web_sm")
            logger.info("Loaded spaCy model en_core_web_sm successfully.")
        except Exception as e:
            logger.warning(f"Could not load en_core_web_sm ({e}). Initializing blank English model.")
            self.nlp = spacy.blank("en")

    def extract_regex_entities(self, text: str) -> Tuple[List[ExtractedEntity], Set[str]]:
        entities = []
        seen = set()

        # Phone numbers
        for match in PHONE_REGEX.finditer(text):
            phone_val = match.group().strip()
            clean_phone = re.sub(r'[\s\-()]', '', phone_val)
            if len(clean_phone) >= 7 and phone_val.lower() not in seen:
                seen.add(phone_val.lower())
                start_c, end_c = match.span()
                # Find sentence context window
                snippet_start = max(0, text.rfind('\n', 0, start_c))
                snippet_end = text.find('\n', end_c)
                snippet = text[snippet_start:snippet_end if snippet_end != -1 else len(text)].strip()
                if not snippet:
                    snippet = text[max(0, start_c - 40):min(len(text), end_c + 40)].strip()

                entities.append(ExtractedEntity(
                    id=f"phone_{clean_phone}",
                    name=phone_val,
                    type=EntityType.PHONE_NUMBER,
                    confidence=0.95,
                    start_char=start_c,
                    end_char=end_c,
                    source_snippet=snippet,
                    extraction_method="regex_phone",
                    metadata={"raw_match": phone_val}
                ))

        # Vehicles
        for match in VEHICLE_REGEX.finditer(text):
            val = match.group().strip()
            if len(val) >= 3 and val.lower() not in seen:
                if not val.isdigit() and val.lower() not in ["in", "on", "at"]:
                    seen.add(val.lower())
                    clean_id = re.sub(r'[^a-zA-Z0-9]', '_', val).lower()
                    start_c, end_c = match.span()
                    snippet_start = max(0, text.rfind('\n', 0, start_c))
                    snippet_end = text.find('\n', end_c)
                    snippet = text[snippet_start:snippet_end if snippet_end != -1 else len(text)].strip()
                    if not snippet:
                        snippet = text[max(0, start_c - 40):min(len(text), end_c + 40)].strip()

                    entities.append(ExtractedEntity(
                        id=f"veh_{clean_id}",
                        name=val.title(),
                        type=EntityType.VEHICLE,
                        confidence=0.88,
                        start_char=start_c,
                        end_char=end_c,
                        source_snippet=snippet,
                        extraction_method="regex_vehicle",
                        metadata={"raw_match": val}
                    ))

        return entities, seen

    def process_text(self, text: str) -> ExtractionResult:
        if not text or not text.strip():
            return ExtractionResult(entities=[], relationships=[], raw_text=text, summary="Empty input")

        doc = self.nlp(text)
        extracted_entities: List[ExtractedEntity] = []
        seen_names: Set[str] = set()

        # 1. First extract Regex entities (Phones, Vehicles)
        regex_entities, regex_seen = self.extract_regex_entities(text)
        for ent in regex_entities:
            extracted_entities.append(ent)
            seen_names.add(ent.name.lower())

        # 2. Extract spaCy NER Entities (Person, Location, Organization)
        for ent in doc.ents:
            name = ent.text.strip()
            if len(name) < 2 or name.lower() in seen_names:
                continue

            entity_type = None
            if ent.label_ == "PERSON":
                entity_type = EntityType.PERSON
            elif ent.label_ in ["GPE", "LOC", "FAC"]:
                entity_type = EntityType.LOCATION
            elif ent.label_ in ["ORG", "NORP"]:
                entity_type = EntityType.ORGANIZATION

            if entity_type:
                seen_names.add(name.lower())
                slug = re.sub(r'[^a-zA-Z0-9]', '_', name).lower().strip('_')
                prefix = entity_type.value[:3].lower()
                ent_obj = ExtractedEntity(
                    id=f"{prefix}_{slug}",
                    name=name,
                    type=entity_type,
                    confidence=0.92,
                    start_char=ent.start_char,
                    end_char=ent.end_char,
                    source_snippet=ent.sent.text.strip(),
                    extraction_method=f"spacy_ner_{ent.label_.lower()}",
                    metadata={"spacy_label": ent.label_}
                )
                extracted_entities.append(ent_obj)

        # 3. Linguistic Dependency Parsing enhancement:
        # Detect PROPN tokens in subject/object position not caught by NER
        for token in doc:
            if token.pos_ == "PROPN" and token.text.lower() not in seen_names and token.text.lower() not in STOP_PROPN:
                # If it acts as subject, object, or conjunction with person
                if token.dep_ in ["nsubj", "dobj", "pobj", "conj", "appos"]:
                    # Ensure it's not following a preposition like 'from', 'in', 'at' (which indicates location)
                    is_location_context = token.head.text.lower() in ["from", "in", "at", "to"] and token.dep_ == "pobj"
                    ent_type = EntityType.LOCATION if is_location_context else EntityType.PERSON

                    name = token.text
                    seen_names.add(name.lower())
                    slug = re.sub(r'[^a-zA-Z0-9]', '_', name).lower().strip('_')
                    prefix = ent_type.value[:3].lower()
                    extracted_entities.append(ExtractedEntity(
                        id=f"{prefix}_{slug}",
                        name=name,
                        type=ent_type,
                        confidence=0.85,
                        start_char=token.idx,
                        end_char=token.idx + len(token.text),
                        source_snippet=token.sent.text.strip(),
                        extraction_method=f"linguistic_dep_{token.dep_}",
                        metadata={"inferred_via": f"pos_{token.pos_}_dep_{token.dep_}"}
                    ))

        # 4. Extract Relationships
        relationships: List[ExtractedRelationship] = []
        rel_signatures = set()

        for sent in doc.sents:
            sent_text = sent.text.strip()
            # Find entities mentioned in this sentence
            sent_entities = []
            for ent in extracted_entities:
                if re.search(r'\b' + re.escape(ent.name) + r'\b', sent_text, re.IGNORECASE):
                    sent_entities.append(ent)

            if len(sent_entities) < 2:
                continue

            # Detect relation verbs in sentence
            detected_relation = None
            for rel_type, keywords in RELATION_VERBS.items():
                for kw in keywords:
                    if re.search(r'\b' + re.escape(kw) + r'\b', sent_text, re.IGNORECASE):
                        detected_relation = rel_type
                        break
                if detected_relation:
                    break

            if not detected_relation:
                detected_relation = RelationshipType.ASSOCIATED_WITH

            persons = [e for e in sent_entities if e.type == EntityType.PERSON]
            locations = [e for e in sent_entities if e.type == EntityType.LOCATION]
            phones = [e for e in sent_entities if e.type == EntityType.PHONE_NUMBER]
            vehicles = [e for e in sent_entities if e.type == EntityType.VEHICLE]
            orgs = [e for e in sent_entities if e.type == EntityType.ORGANIZATION]

            # Person -> Person (CALLED, TRANSACTED_WITH, ASSOCIATED_WITH)
            if len(persons) >= 2:
                source_p = persons[0]
                for target_p in persons[1:]:
                    sig = (source_p.id, target_p.id, detected_relation.value)
                    if sig not in rel_signatures:
                        rel_signatures.add(sig)
                        relationships.append(ExtractedRelationship(
                            id=f"rel_{uuid.uuid4().hex[:8]}",
                            source=source_p.name,
                            source_type=source_p.type,
                            target=target_p.name,
                            target_type=target_p.type,
                            relationship_type=detected_relation,
                            confidence=0.88,
                            evidence=sent_text,
                            source_snippet=sent_text,
                            extraction_method=f"dep_relation_{detected_relation.value.lower()}"
                        ))

            # Person -> Location (VISITED / LOCATED_AT)
            for p in persons:
                for loc in locations:
                    loc_rel = RelationshipType.VISITED
                    if "located" in sent_text.lower() or "lives in" in sent_text.lower():
                        loc_rel = RelationshipType.LOCATED_AT
                    sig = (p.id, loc.id, loc_rel.value)
                    if sig not in rel_signatures:
                        rel_signatures.add(sig)
                        relationships.append(ExtractedRelationship(
                            id=f"rel_{uuid.uuid4().hex[:8]}",
                            source=p.name,
                            source_type=p.type,
                            target=loc.name,
                            target_type=loc.type,
                            relationship_type=loc_rel,
                            confidence=0.90,
                            evidence=sent_text,
                            source_snippet=sent_text,
                            extraction_method=f"dep_relation_{loc_rel.value.lower()}"
                        ))

            # Person -> Vehicle (OWNS)
            for p in persons:
                for veh in vehicles:
                    sig = (p.id, veh.id, RelationshipType.OWNS.value)
                    if sig not in rel_signatures:
                        rel_signatures.add(sig)
                        relationships.append(ExtractedRelationship(
                            id=f"rel_{uuid.uuid4().hex[:8]}",
                            source=p.name,
                            source_type=p.type,
                            target=veh.name,
                            target_type=veh.type,
                            relationship_type=RelationshipType.OWNS,
                            confidence=0.88,
                            evidence=sent_text,
                            source_snippet=sent_text,
                            extraction_method="dep_relation_owns_vehicle"
                        ))

            # Person -> Phone Number (CALLED or OWNS)
            for p in persons:
                for ph in phones:
                    ph_rel = RelationshipType.CALLED if detected_relation == RelationshipType.CALLED else RelationshipType.OWNS
                    sig = (p.id, ph.id, ph_rel.value)
                    if sig not in rel_signatures:
                        rel_signatures.add(sig)
                        relationships.append(ExtractedRelationship(
                            id=f"rel_{uuid.uuid4().hex[:8]}",
                            source=p.name,
                            source_type=p.type,
                            target=ph.name,
                            target_type=ph.type,
                            relationship_type=ph_rel,
                            confidence=0.92,
                            evidence=sent_text,
                            source_snippet=sent_text,
                            extraction_method=f"dep_relation_{ph_rel.value.lower()}_phone"
                        ))

            # Person -> Organization (WORKS_FOR / ASSOCIATED_WITH)
            for p in persons:
                for org in orgs:
                    org_rel = RelationshipType.WORKS_FOR if ("work" in sent_text.lower() or "member" in sent_text.lower()) else RelationshipType.ASSOCIATED_WITH
                    sig = (p.id, org.id, org_rel.value)
                    if sig not in rel_signatures:
                        rel_signatures.add(sig)
                        relationships.append(ExtractedRelationship(
                            id=f"rel_{uuid.uuid4().hex[:8]}",
                            source=p.name,
                            source_type=p.type,
                            target=org.name,
                            target_type=org.type,
                            relationship_type=org_rel,
                            confidence=0.86,
                            evidence=sent_text,
                            source_snippet=sent_text,
                            extraction_method=f"dep_relation_{org_rel.value.lower()}_org"
                        ))

        summary_str = (
            f"Extracted {len(extracted_entities)} entities "
            f"({sum(1 for e in extracted_entities if e.type == EntityType.PERSON)} Persons, "
            f"{sum(1 for e in extracted_entities if e.type == EntityType.LOCATION)} Locations) "
            f"and {len(relationships)} relationships."
        )

        return ExtractionResult(
            entities=extracted_entities,
            relationships=relationships,
            raw_text=text,
            summary=summary_str
        )


nlp_service = NLPService()


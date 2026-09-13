from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, EmailStr, Field


# -------------------------------------------------------------
# Enums
# -------------------------------------------------------------
class UserRole(str, Enum):
    ADMIN = "admin"
    INVESTIGATOR = "investigator"


class EntityType(str, Enum):
    PERSON = "Person"
    LOCATION = "Location"
    VEHICLE = "Vehicle"
    PHONE_NUMBER = "PhoneNumber"
    ORGANIZATION = "Organization"


class RelationshipType(str, Enum):
    CALLED = "CALLED"
    VISITED = "VISITED"
    OWNS = "OWNS"
    ASSOCIATED_WITH = "ASSOCIATED_WITH"
    TRANSACTED_WITH = "TRANSACTED_WITH"
    WORKS_FOR = "WORKS_FOR"
    LOCATED_AT = "LOCATED_AT"


class AlertSeverity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class AlertStatus(str, Enum):
    NEW = "NEW"
    INVESTIGATING = "INVESTIGATING"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"


class AlertRuleType(str, Enum):
    BURNER_PHONE = "BURNER_PHONE"
    CO_LOCATION_CLUSTER = "CO_LOCATION_CLUSTER"
    DENSE_SYNDICATE = "DENSE_SYNDICATE"
    REPEATED_FLAGGED_INTERACTION = "REPEATED_FLAGGED_INTERACTION"


# -------------------------------------------------------------
# User & Auth Schemas
# -------------------------------------------------------------
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    badge_number: Optional[str] = None
    role: UserRole = UserRole.INVESTIGATOR
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None


# -------------------------------------------------------------
# Entity & Extraction Schemas
# -------------------------------------------------------------
class ExtractedEntity(BaseModel):
    id: Optional[str] = None
    name: str
    type: EntityType
    confidence: float = 1.0
    risk_score: float = 0.0
    metadata: Dict[str, Any] = Field(default_factory=dict)
    aliases: List[str] = Field(default_factory=list)


class ExtractedRelationship(BaseModel):
    id: Optional[str] = None
    source: str
    source_type: EntityType
    target: str
    target_type: EntityType
    relationship_type: RelationshipType
    confidence: float = 1.0
    evidence: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ExtractionResult(BaseModel):
    entities: List[ExtractedEntity] = Field(default_factory=list)
    relationships: List[ExtractedRelationship] = Field(default_factory=list)
    raw_text: str = ""
    summary: str = ""


# -------------------------------------------------------------
# Upload & Case Records
# -------------------------------------------------------------
class UploadHistoryItem(BaseModel):
    id: str
    title: str
    file_type: str  # csv, json, pdf, image, text
    file_name: Optional[str] = None
    cloudinary_url: Optional[str] = None
    entities_count: int = 0
    relationships_count: int = 0
    uploaded_by: str
    uploaded_at: datetime
    summary: Optional[str] = None


class RawTextInput(BaseModel):
    title: str = "Investigation Report"
    text: str


# -------------------------------------------------------------
# Graph Schemas (Cytoscape & Intelligence Graph Compatible)
# -------------------------------------------------------------
class GraphNode(BaseModel):
    id: str
    label: str
    type: str = "Person"
    risk_score: float = 0.0
    influence_score: float = 0.0
    community_id: str = "C-1"
    connections_count: int = 0
    properties: Dict[str, Any] = Field(default_factory=dict)


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str = "ASSOCIATED_WITH"
    label: Optional[str] = None
    confidence: float = 1.0
    frequency: int = 1
    timestamp: Optional[str] = None
    source_document: Optional[str] = None
    evidence: Optional[str] = None
    properties: Dict[str, Any] = Field(default_factory=dict)


class NetworkGraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    stats: Dict[str, Any] = Field(default_factory=dict)


class PathQuery(BaseModel):
    source_id: str
    target_id: str
    max_depth: int = 4


# -------------------------------------------------------------
# AI Investigation Copilot Schemas
# -------------------------------------------------------------
class GraphAction(BaseModel):
    type: str  # focus_node, highlight_nodes, trace_path, expand_neighborhood, filter_community, reset
    target_id: Optional[str] = None
    target_ids: Optional[List[str]] = None
    path: Optional[List[str]] = None
    label: Optional[str] = None
    hops: Optional[int] = None
    community_id: Optional[str] = None


class AICopilotQuery(BaseModel):
    question: str
    selected_entity_id: Optional[str] = None
    session_id: Optional[str] = None


class AICopilotResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]] = Field(default_factory=list)
    entities_involved: List[Dict[str, Any]] = Field(default_factory=list)
    graph_actions: List[GraphAction] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.utcnow)



# -------------------------------------------------------------
# Alert Schemas
# -------------------------------------------------------------
class AlertRecord(BaseModel):
    id: str
    rule_type: AlertRuleType
    severity: AlertSeverity
    title: str
    description: str
    entities_involved: List[Dict[str, str]]  # list of {id, name, type}
    evidence: Optional[str] = None
    status: AlertStatus = AlertStatus.NEW
    created_at: datetime
    updated_at: Optional[datetime] = None


class AlertStatusUpdate(BaseModel):
    status: AlertStatus
    investigator_notes: Optional[str] = None


# -------------------------------------------------------------
# Report Schemas
# -------------------------------------------------------------
class ReportGenerateRequest(BaseModel):
    suspect_id: Optional[str] = None
    case_title: Optional[str] = "Criminal Network Intelligence Report"
    include_associates: bool = True
    include_subgraph: bool = True
    include_alerts: bool = True
    notes: Optional[str] = None


# -------------------------------------------------------------
# Dashboard Stats Schemas
# -------------------------------------------------------------
class DashboardStats(BaseModel):
    total_persons: int = 0
    total_relationships: int = 0
    total_alerts: int = 0
    total_locations: int = 0
    total_vehicles: int = 0
    total_phones: int = 0
    total_cases: int = 0
    risk_distribution: Dict[str, int] = Field(default_factory=dict)
    recent_alerts: List[AlertRecord] = Field(default_factory=list)
    top_suspects: List[Dict[str, Any]] = Field(default_factory=list)
    database_status: Dict[str, bool] = Field(default_factory=dict)


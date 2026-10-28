# System Architecture: AI-Powered Criminal Network Analysis Platform

## 1. High-Level Architecture

The platform follows clean architecture principles with decoupled presentation, application services, database access layers, and NLP pipelines.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        React 18 Single Page App                        │
│    (Tailwind CSS, React Flow 11, Axios Interceptors, Context Auth)     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS / REST JSON
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          FastAPI Web Service                           │
│  ├── /api/auth       (JWT authentication & role-based authorization)  │
│  ├── /api/upload     (Multi-modal evidence ingestion pipeline)         │
│  ├── /api/entities   (Intelligence entity search & profile retrieval) │
│  ├── /api/graph      (React Flow network endpoints & shortest paths)   │
│  ├── /api/alerts     (Rule-based suspicious activity detection)       │
│  ├── /api/reports    (ReportLab binary PDF dossier generation)         │
│  ├── /api/dashboard  (Operational intelligence telemetry & KPIs)       │
│  └── /api/admin      (User governance, audit logs & demo data)        │
└──────────────┬────────────────────┬────────────────────┬───────────────┘
               │                    │                    │
               ▼                    ▼                    ▼
     ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐
     │  MongoDB Storage │  │   Neo4j Graph    │  │  Cloudinary   │
     │  - Users & Roles │  │  - Person        │  │  Surveillance │
     │  - Case Records  │  │  - Location      │  │  Media &      │
     │  - Upload Logs   │  │  - Vehicle       │  │  Evidence     │
     │  - Extractions   │  │  - PhoneNumber   │  │  Mugshots     │
     │  - Alert Triage  │  │  - Organization  │  └───────────────┘
     │  - Audit History │  │  (Multi-Relational)│
     └──────────────────┘  └──────────────────┘
```

## 2. Database Responsibilities

### MongoDB
Stores document-centric, semi-structured, and audit data:
- **`users`**: System credentials, hashed passwords, roles (`admin`, `investigator`), badge numbers.
- **`cases` / `uploads`**: Raw case files, PDF text, CSV data, JSON feeds, Cloudinary image URLs, upload timestamps.
- **`extractions`**: NLP extraction logs, confidence metrics, raw text snippets.
- **`alerts`**: Detected suspicious incidents, severity ratings (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`), triage status (`NEW`, `INVESTIGATING`, `RESOLVED`, `DISMISSED`).
- **`audit_logs`**: Formal dossier generation records, account creation logs, user deactivation logs.

### Neo4j Graph Database
Models interconnected relationships and graph topology:
- **Node Labels**:
  - `Person`: Suspects, kingpins, couriers, front company owners.
  - `Location`: Safehouses, cargo docks, villas, foreign liaison offices.
  - `Vehicle`: Getaway cars, courier vans, SUVs, license plate tracking.
  - `PhoneNumber`: Burner lines, cellular wiretaps, IMSI identities.
  - `Organization`: Shell corporations, Hawala channels, front logistics firms.
- **Relationship Edges**:
  - `CALLED`: Voice wiretaps, SMS logs, VoIP calls.
  - `VISITED`: Cell tower pings, ANPR camera sightings, hotel registers.
  - `OWNS`: Vehicle registrations, SIM subscriber profiles.
  - `ASSOCIATED_WITH`: Informant testimony, mutual syndicate involvement.
  - `TRANSACTED_WITH`: Hawala ledger entries, wire transfers.
  - `WORKS_FOR`: Directorships, corporate payroll records.
  - `LOCATED_AT`: Leased addresses, commercial registration premises.

## 3. Resilience & In-Memory Fallback Mechanism
The system features transparent dual-mode operation:
- If MongoDB or Neo4j are active on the host, the platform connects to live database drivers.
- If either database is temporarily offline during testing or local development, the backend automatically activates:
  - An async in-memory document store matching the Motor/MongoDB interface.
  - A high-performance NetworkX graph engine matching the Neo4j Cypher query interfaces.
This ensures zero downtime and instant out-of-the-box evaluation.


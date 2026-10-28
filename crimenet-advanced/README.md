# AI-Powered Criminal Network Analysis System (CRIMENET)

A production-grade, tactical intelligence platform designed for law enforcement and intelligence agencies to ingest crime-related records, extract named entities and operational relationships via **spaCy NLP**, model multi-layer criminal networks in **Neo4j**, persist cases and forensic media in **MongoDB** and **Cloudinary**, run graph centrality and risk algorithms, flag suspicious syndicate patterns, and generate downloadable intelligence PDF dossiers.

---

## Architecture Overview

```
+---------------------------------------------------------------------------------------+
|                                  React 18 + Vite UI                                   |
|  - Tactical Dark Theme (Tailwind CSS)          - Interactive React Flow Canvas        |
|  - Role-Based Access Control (Admin / Inv)     - Live NLP Ingestion Feedback          |
|  - Rule Alert Center & Incident Triage         - PDF Intelligence Dossier Downloader  |
+-------------------------------------------+-------------------------------------------+
                                            | REST API (Axios / Bearer JWT)
                                            v
+---------------------------------------------------------------------------------------+
|                                    FastAPI Backend                                    |
|  +--------------------+  +--------------------+  +---------------------------------+  |
|  | Auth Service (JWT) |  | Upload Engine      |  | spaCy NLP Extraction Engine     |  |
|  | Role Guards (RBAC) |  | (PDF/CSV/JSON/IMG) |  | - NER: Person, Loc, Org, Phone  |  |
|  +--------------------+  +--------------------+  +---------------------------------+  |
|  +--------------------+  +--------------------+  +---------------------------------+  |
|  | Graph Service      |  | Network Analytics  |  | Suspicious Detection Engine     |  |
|  | Neo4j & NetworkX   |  | Centrality & Paths |  | 4 Rule Policies & Triage       |  |
|  +--------------------+  +--------------------+  +---------------------------------+  |
|  +--------------------------------------------------------------------------------+  |
|  | ReportLab PDF Dossier Generator (Formal Law Enforcement Layout)                 |  |
+------------------------------------+--------------------------------------------------+
                                     |
             +-----------------------+-----------------------+
             v                                               v
+-------------------------+                     +-------------------------+
|     MongoDB Database    |                     |     Neo4j Database      |
| - Users & Credentials   |                     | - Nodes:                |
| - Cases & FIR Documents |                     |   Person, Location,     |
| - Upload Audit History  |                     |   Vehicle, Phone Number,|
| - Cloudinary Image URLs |                     |   Organization          |
| - Alert Records         |                     | - Relationships:        |
| - Generation Audit Trail|                     |   CALLED, VISITED, OWNS,|
+-------------------------+                     |   ASSOCIATED_WITH,      |
                                                |   TRANSACTED_WITH,      |
                                                |   WORKS_FOR, LOCATED_AT |
                                                +-------------------------+
```

---

## Key Features

1. **Multi-Format Evidence Ingestion**:
   - Ingest **PDF FIR documents**, **CSV call records (CDR)**, **JSON crime feeds**, and raw statement texts.
   - Cloudinary integration for surveillance photos and suspect mugshots with MongoDB secure URL indexing.

2. **spaCy NLP Processing & Linguistic Parsing**:
   - Named Entity Recognition (NER) augmented with dependency parsing (`nsubj`, `dobj`) and gazetteer patterns for:
     - Person Names
     - Locations & Safehouses
     - Organizations & Shell Fronts
     - Phone Numbers (International & local formats)
     - Vehicles (License plates, vehicle models)
   - Automatic relationship classification (`CALLED`, `VISITED`, `OWNS`, `TRANSACTED_WITH`, `WORKS_FOR`, `LOCATED_AT`, `ASSOCIATED_WITH`).

3. **Neo4j Criminal Graph Builder**:
   - Directed multi-relational graph modeling with Cypher queries.
   - Built-in transparent **NetworkX in-memory graph fallback** so the platform runs immediately out-of-the-box even before Neo4j or MongoDB instances are booted.

4. **Network Intelligence & Centrality Analytics**:
   - Degree Centrality & Brokerage / Betweenness Centrality calculation.
   - Most Connected Individual identification (facilitators vs. kingpins).
   - Hidden Relationship Discovery (co-occurrence inference linking unconnected suspects via shared burner phones or safehouses).
   - Shortest Connection Path Tracer between any two criminal entities.
   - Community Detection (modularity clustering isolating syndicate sub-cells).
   - Composite Threat Risk Score (0 - 100) dynamically assigned to every node.

5. **Rule-Based Suspicious Activity Detection**:
   - **Rule 1: Burner Phone Sharing** — Flags single phone numbers linked to $\ge 2$ suspects.
   - **Rule 2: Safehouse Co-location** — Flags venues visited by $\ge 2$ targets.
   - **Rule 3: Syndicate Cell Density** — Detects tightly meshed multi-suspect cliques.
   - **Rule 4: Multi-Channel Interactions** — Flags repeated cross-cutting calls and wire transactions.

6. **Interactive React Flow Canvas**:
   - Custom nodes with color-coded risk rings and type-specific badges.
   - Zoom, pan, minimap, fit view, and type/risk filter controls.
   - Path discovery highlighting shortest connection chains in glowing cyan.
   - Slide-out Node Inspection Drawer.

7. **Downloadable PDF Intelligence Dossier**:
   - Formal law-enforcement formatting generated using **ReportLab**.
   - Includes suspect profile, risk gauges, associated contacts table, safehouses, logistical assets, and investigator briefing notes.

---

## Default System Credentials

| Role | Email | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@intelligence.gov` | `Admin@123` | Full system governance, user creation, deactivation, audit logs, demo data reload |
| **Investigator** | `investigator@intelligence.gov` | `Investigator@123` | Evidence upload, NLP extraction, network canvas, alert triage, PDF report generation |

*Both profiles are available as one-click login buttons on the login screen.*

---

## Quick Start Guide

### 1. Prerequisites
- **Python 3.12+**
- **Node.js 18+** & **npm**
- *(Optional)* MongoDB running on `localhost:27017`
- *(Optional)* Neo4j running on `localhost:7687`

> **Note**: If MongoDB or Neo4j are not running locally, the system automatically activates its built-in in-memory document store and NetworkX graph engine so all features, calculations, and visualizations work immediately.

---

### 2. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Download the spaCy NLP language model
python -m spacy download en_core_web_sm

# Configure environment variables (copy template)
cp .env.example .env

# Run automated tests
python -m pytest tests/test_backend.py -v

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

The backend is now live:
- API Base: `http://localhost:8000/api`
- Interactive Swagger UI: `http://localhost:8000/docs`
- Health Telemetry: `http://localhost:8000/health`

---

### 3. Frontend Setup

```bash
cd frontend

# Install packages
npm install --ignore-scripts --no-audit --no-fund

# Start Vite development server
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Environment Variables Reference

Create a `.env` file in the project root or `backend/`:

```env
# MongoDB Database
MONGODB_URI=mongodb://localhost:27017/criminal_intelligence

# Neo4j Database
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password

# Cloudinary Image Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Authentication
JWT_SECRET_KEY=crimenetwork_super_secret_jwt_key_change_in_production_2026
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480

# Environment
ENVIRONMENT=development
```

---

## REST API Specifications

### Authentication
- `POST /api/auth/login` — Authenticate and receive JWT access token.
- `POST /api/auth/logout` — Revoke token session.
- `GET /api/auth/me` — Current authenticated user profile.
- `POST /api/auth/register` — Admin-only investigator creation.

### Uploads & Ingestion
- `POST /api/upload/text` — Direct raw statement / FIR text ingestion.
- `POST /api/upload/pdf` — PDF investigation report text extraction and ingestion.
- `POST /api/upload/csv` — CSV call records / CDR processing.
- `POST /api/upload/json` — JSON intelligence feed ingestion.
- `POST /api/upload/image` — Evidence image upload to Cloudinary with MongoDB URL index.
- `GET /api/upload/history` — Ingested documents and media history.

### Entities
- `GET /api/entities` — Search and filter entities (`query`, `type`, `min_risk`, `limit`).
- `GET /api/entities/{id}` — Retrieve full profile, risk score, and 1-hop associates.
- `POST /api/entities` — Manually add/update intelligence entity.

### Graph
- `GET /api/graph/network` — Nodes and edges formatted for React Flow canvas.
- `GET /api/graph/person/{id}` — 1-hop or 2-hop neighborhood for specific target.
- `GET /api/graph/path` — Shortest criminal connection path between two entities.
- `GET /api/graph/analysis` — Centrality metrics, hidden relationships, and communities.

### Alerts
- `GET /api/alerts` — List suspicious activity alerts (`severity`, `status`).
- `POST /api/alerts/run-detection` — Execute rule-based detection engine across graph.
- `PATCH /api/alerts/{id}` — Update alert status (`NEW`, `INVESTIGATING`, `RESOLVED`, `DISMISSED`).

### Reports
- `POST /api/reports/generate` — Generate and stream formal intelligence PDF dossier.
- `GET /api/reports` — View generated report audit history.

### Dashboard & Admin
- `GET /api/dashboard/stats` — Metrics: Total Persons, Relationships, Alerts, Locations, Cases, risk tiers.
- `GET /api/admin/users` — List registered users (Admin only).
- `DELETE /api/admin/users/{id}` — Deactivate user (Admin only).
- `GET /api/admin/audit-logs` — Security audit logs (Admin only).
- `POST /api/admin/seed-demo` — Reload ShadowNet Syndicate intelligence dataset.

---

## Directory Structure

```
criminal-network-analysis/
├── backend/
│   ├── app/
│   │   ├── api/             # FastAPI route controllers
│   │   │   ├── admin.py
│   │   │   ├── alerts.py
│   │   │   ├── auth.py
│   │   │   ├── dashboard.py
│   │   │   ├── entities.py
│   │   │   ├── graph.py
│   │   │   ├── reports.py
│   │   │   └── upload.py
│   │   ├── database/        # Database drivers with fallback resilience
│   │   │   ├── mongodb.py
│   │   │   └── neo4j_client.py
│   │   ├── models/          # Pydantic v2 schemas and validation
│   │   │   └── schemas.py
│   │   ├── services/        # Core business logic
│   │   │   ├── alert_service.py
│   │   │   ├── auth_service.py
│   │   │   ├── cloudinary_service.py
│   │   │   ├── graph_service.py
│   │   │   ├── network_analysis.py
│   │   │   ├── nlp_service.py
│   │   │   └── report_service.py
│   │   ├── utils/           # Config and logger
│   │   │   ├── config.py
│   │   │   └── logger.py
│   │   └── main.py          # Application entrypoint & lifespan
│   ├── tests/
│   │   └── test_backend.py  # Pytest automated test suite
│   ├── requirements.txt     # Python production dependencies
│   ├── seed_data.py         # Realistic syndicate dataset seeder
│   └── .env                 # Local development environment configuration
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── graph/       # Custom React Flow nodes & drawer
│   │   │   │   ├── CustomNodes.jsx
│   │   │   │   └── NodeDrawer.jsx
│   │   │   └── layout/      # Navbar, Sidebar
│   │   │       ├── Navbar.jsx
│   │   │       └── Sidebar.jsx
│   │   ├── context/         # AuthContext & RBAC state
│   │   │   └── AuthContext.jsx
│   │   ├── pages/           # 7 Tactical intelligence pages
│   │   │   ├── AdminManagement.jsx
│   │   │   ├── AlertCenter.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── EntityExplorer.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── NetworkGraph.jsx
│   │   │   ├── ReportGenerator.jsx
│   │   │   └── UploadCenter.jsx
│   │   ├── services/        # Axios API client with JWT interceptor
│   │   │   └── api.js
│   │   ├── App.jsx          # Protected routing
│   │   ├── index.css        # Tailwind & graph canvas styles
│   │   └── main.jsx         # Vite root entry
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── data/                    # Sample intelligence datasets
│   ├── call_records.csv
│   ├── sample_firs.json
│   └── sample_fir.pdf
│
├── docs/                    # Architecture and API documentation
├── README.md
└── .env.example             # Clean environment template
```

#   C r i m i n a l - D e t e c t o r  
 "# Criminal-Detector" 
"# Criminal-Detector" 
#   C r i m i n a l - D e t e c t o r  
 #   C r i m i n a l - D e t e c t o r  
 #   C r i m i n a l - D e t e c t o r  
 
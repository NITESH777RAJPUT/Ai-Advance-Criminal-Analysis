# REST API Reference: Criminal Network Analysis Platform

All API endpoints are prefixed with `/api`. Interactive documentation is available at `/docs` (Swagger UI) and `/redoc`.

---

## 1. Authentication (`/api/auth`)

### `POST /api/auth/login`
Authenticates a user and returns a Bearer JWT token.
- **Request Body**:
  ```json
  {
    "email": "investigator@intelligence.gov",
    "password": "Investigator@123"
  }
  ```
- **Response**:
  ```json
  {
    "access_token": "<jwt_string>",
    "token_type": "bearer",
    "user": {
      "id": "usr_inv01",
      "email": "investigator@intelligence.gov",
      "full_name": "Special Agent Miller",
      "badge_number": "INV-742",
      "role": "investigator",
      "is_active": true,
      "created_at": "2026-09-08T04:25:32.667000Z"
    }
  }
  ```

### `POST /api/auth/logout`
Logs out current user session. Requires Bearer Token.

### `GET /api/auth/me`
Returns current authenticated user details. Requires Bearer Token.

---

## 2. Ingestion & Uploads (`/api/upload`)

### `POST /api/upload/text`
Ingest raw statement or FIR text. Automatically triggers spaCy NLP extraction and graph ingestion.
- **Request Body**:
  ```json
  {
    "title": "Interception Statement",
    "text": "Rahul called Aman from Pune."
  }
  ```

### `POST /api/upload/pdf`
Upload PDF evidence (multipart form-data with `file` and optional `title`).

### `POST /api/upload/csv`
Upload CSV records (multipart form-data with `file` and optional `title`).

### `POST /api/upload/json`
Upload JSON incident files (multipart form-data with `file` and optional `title`).

### `POST /api/upload/image`
Upload photo evidence to Cloudinary (multipart form-data with `file`, optional `suspect_name`, and `notes`).

### `GET /api/upload/history`
Retrieve audit history of uploaded cases and Cloudinary assets.

---

## 3. Entities & Search (`/api/entities`)

### `GET /api/entities`
Query parameters:
- `query` (string): Filter by name or ID
- `type` (string): `Person`, `Location`, `Vehicle`, `PhoneNumber`, `Organization`
- `min_risk` (float): Minimum risk score threshold
- `limit` (int): Max records (default 50)

### `GET /api/entities/{entity_id}`
Returns full entity profile, 1-hop connected neighbors, risk breakdown, and known properties.

---

## 4. Graph Visualization & Analysis (`/api/graph`)

### `GET /api/graph/network`
Returns nodes and edges formatted for React Flow canvas.
- Query parameters: `node_types`, `rel_types`, `limit`.

### `GET /api/graph/person/{person_id}`
Returns ego subgraph neighborhood surrounding a specific suspect.

### `GET /api/graph/path`
Computes shortest connection path between two targets.
- Query parameters: `source_id`, `target_id`.

### `GET /api/graph/analysis`
Returns betweenness centrality, degree centrality, most connected nodes, hidden relationships, and modularity communities.

---

## 5. Suspicious Activity Alerts (`/api/alerts`)

### `GET /api/alerts`
Filter alerts by `severity` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) and `status` (`NEW`, `INVESTIGATING`, `RESOLVED`, `DISMISSED`).

### `POST /api/alerts/run-detection`
Manually trigger the 4 rule detection policies across the graph.

### `PATCH /api/alerts/{alert_id}`
Update triage status and investigator notes.

---

## 6. Report Generation (`/api/reports`)

### `POST /api/reports/generate`
Generates and streams an official law-enforcement intelligence PDF dossier.
- **Request Body**:
  ```json
  {
    "suspect_id": "per_rahul_sharma",
    "case_title": "Operation ShadowNet",
    "include_associates": true,
    "include_alerts": true,
    "notes": "Field arrest warrant requested."
  }
  ```
- **Response**: Binary stream `application/pdf`.


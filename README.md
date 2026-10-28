# 🕵️ CRIMENET — AI-Powered Criminal Network Analysis System

**Transforming complex crime-related data into actionable network intelligence.**

CRIMENET is an AI-powered criminal network analysis platform designed to help investigators analyze crime-related records, discover relationships between entities, visualize interconnected networks, identify suspicious patterns, and generate structured intelligence reports.

The platform combines Natural Language Processing (NLP), graph databases, network analytics, and interactive visualization to support data-driven investigative workflows.

> **Disclaimer:** CRIMENET is a research and decision-support project. Its automated findings are investigative leads, not proof of criminal activity. All results require human verification.

---

## 📌 Table of Contents

- Overview
- Key Features
- Technology Stack
- System Architecture
- Project Structure
- Prerequisites
- Installation & Setup
- Environment Configuration
- API Documentation
- Security Considerations
- Future Enhancements
- Contributing
- License

---

## 🚀 Overview

Crime investigations can involve large amounts of unstructured documents, call records, reports, and interconnected entities. Manually identifying relationships across these sources can be time-consuming.

CRIMENET provides a unified platform to:

- Extract entities and potential relationships from crime-related text.
- Represent entities and their connections using graph structures.
- Analyze network connectivity and relationship patterns.
- Flag potentially suspicious patterns for further investigation.
- Explore networks through an interactive graph interface.
- Generate downloadable PDF intelligence reports.

The system is designed with a modular architecture so that its frontend, backend, NLP engine, analytics services, and databases can be maintained independently.

## ✨ Key Features

### 1. 📂 Multi-Format Evidence Ingestion

Process supported investigation data, including:

- PDF documents and FIR reports.
- CSV files containing structured call records.
- JSON intelligence feeds.
- Raw text statements.
- Image evidence through supported cloud-storage integrations.

### 2. 🧠 NLP-Based Entity Extraction

Uses spaCy and rule-based processing to identify relevant entities, such as:

- Persons
- Locations
- Organizations
- Phone numbers
- Vehicles

Extracted information can be used to identify potential relationships between entities. Extraction accuracy depends on the input data, language, document quality, and configured processing rules.

### 3. 🕸️ Criminal Network Visualization

Explore interconnected entities through an interactive graph interface.

- Interactive nodes and relationship edges.
- Zoom, pan, and graph navigation.
- Entity inspection and relationship exploration.
- Filtering by entity type and risk indicators.
- Shortest-path exploration between selected entities.

### 4. 📊 Network Intelligence & Analytics

The analytics layer supports graph-based investigation using:

- Degree centrality.
- Betweenness centrality.
- Shortest-path analysis.
- Community detection.
- Relationship and co-occurrence analysis.
- Configurable entity risk scores.

Graph metrics describe structural patterns in a network. They do not independently establish criminal intent or guilt.

### 5. 🚨 Suspicious Pattern Detection

Configurable detection rules can flag patterns such as:

- Shared phone numbers among multiple entities.
- Multiple targets associated with a common location.
- Densely interconnected groups.
- Repeated interactions across different communication or transaction channels.

Alerts are intended to prioritize human review. A shared connection or unusual pattern may have a legitimate explanation.

### 6. 📑 PDF Intelligence Reports

Generate structured PDF reports containing supported investigation information, including:

- Entity profiles.
- Associated entities and relationships.
- Network and risk indicators.
- Relevant locations and assets.
- Investigator notes and summaries.

### 7. 🔐 Authentication & Access Control

The platform includes authentication and role-based access control capabilities for administrative and investigator workflows.

Access permissions, session handling, and authorization rules should be configured and validated before deployment in any real investigative environment.

---

## 🛠️ Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite, JavaScript |
| Styling | Tailwind CSS |
| Graph Visualization | React Flow |
| API Client | Axios |
| Backend | Python, FastAPI |
| NLP | spaCy |
| Graph Database | Neo4j |
| Document Database | MongoDB |
| Graph Analytics | NetworkX |
| Authentication | JWT |
| Image Storage | Cloudinary |
| PDF Generation | ReportLab |
| Testing | Pytest |

---

## 🏗️ System Architecture

```text
┌─────────────────────────────────────┐
│          React Frontend             │
│ Dashboard · Graph · Alerts · Reports│
└──────────────────┬──────────────────┘
                   │ REST API
                   ▼
┌─────────────────────────────────────┐
│           FastAPI Backend           │
│ Authentication · API · Validation   │
└──────────────────┬──────────────────┘
                   │
          ┌────────┴─────────┐
          ▼                  ▼
┌──────────────────┐ ┌──────────────────┐
│   NLP Pipeline   │ │  Graph Analytics  │
│      spaCy       │ │    NetworkX       │
└────────┬─────────┘ └────────┬─────────┘
         └──────────┬─────────┘
                    ▼
          ┌───────────────────┐
          │   Neo4j Graph DB  │
          │ Entities & Links  │
          └───────────────────┘

          ┌───────────────────┐
          │    MongoDB        │
          │ Cases, Users, Logs│
          └───────────────────┘
```

The frontend communicates with the backend through REST APIs. The backend coordinates document processing, entity extraction, graph operations, analytics, alert generation, and report creation.

Neo4j stores graph relationships, while MongoDB stores supported application records and metadata.

---

## 📁 Project Structure

```text
CRIMENET/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── context/
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── database/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── algorithms/
│   │   └── main.py
│   ├── tests/
│   └── requirements.txt
│
├── data/
│   └── samples/
├── docs/
├── scripts/
├── .github/
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
```

*This is the recommended logical structure. Adapt it to the files and modules actually present in your repository.*

---

## ⚙️ Prerequisites

Install the following before starting:

- Python 3.12 or a compatible version supported by the project's dependencies.
- Node.js 18+ and npm.
- Git.
- MongoDB, if using the MongoDB integration.
- Neo4j, if using the Neo4j graph database.
- Cloudinary credentials, if using cloud-based image storage.

Check your installed versions:

```bash
python --version
node --version
npm --version
git --version
```

## 💻 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd YOUR_REPOSITORY
```

Replace the repository URL with your actual GitHub repository URL.

### 2. Configure the Backend

```bash
cd backend

python -m venv .venv
```

Activate the virtual environment.

**Windows PowerShell:**

```powershell
.\.venv\Scripts\Activate.ps1
```

**Windows Command Prompt:**

```bat
.venv\Scripts\activate.bat
```

Install the Python dependencies:

```bash
python -m pip install -r requirements.txt
```

Install the spaCy language model if it is not already installed through the project setup:

```bash
python -m spacy download en_core_web_sm
```

Configure your environment variables using the provided `.env.example` template. See the Environment Configuration section below.

Run tests, if configured:

```bash
python -m pytest tests/ -v
```

Start the backend from the `backend/` directory:

```bash
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Backend endpoints, when configured as described:

- API: `http://127.0.0.1:8000/api`
- Swagger documentation: `http://127.0.0.1:8000/docs`
- Health endpoint: `http://127.0.0.1:8000/health`

### 3. Configure the Frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, typically:

`http://localhost:5173`

Ensure the frontend API configuration points to the running backend.

---

## 🔑 Environment Configuration

Create local environment files based on the provided `.env.example` templates.

Example backend configuration:

```env
ENVIRONMENT=development

MONGODB_URI=mongodb://localhost:27017/crimenet

NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=replace_with_your_password

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

JWT_SECRET_KEY=replace_with_a_long_random_secret
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

These are example values, not production credentials. Use the exact variable names expected by your implementation.

**Security rules:**

- Never commit `.env` files or real API keys.
- Use strong, randomly generated secrets.
- Do not expose backend secrets in frontend environment variables.
- Restrict database access and use least-privilege credentials.
- Rotate any secret that has accidentally been published.

---

## 📡 API Documentation

The backend exposes REST endpoints for authentication, evidence ingestion, entity exploration, graph analysis, alerts, reports, and administrative operations.

The following routes describe the intended API surface; verify availability against the actual backend implementation.

| Module | Example Endpoint | Purpose |
|---|---|---|
| Authentication | `POST /api/auth/login` | Authenticate a user |
| Dashboard | `GET /api/dashboard/stats` | Retrieve dashboard metrics |
| Entities | `GET /api/entities` | Search entities |
| Graph | `GET /api/graph/network` | Retrieve graph data |
| Graph | `GET /api/graph/path` | Explore a connection path |
| Analytics | `GET /api/graph/analysis` | Retrieve network analysis |
| Upload | `POST /api/upload/text` | Process text evidence |
| Upload | `POST /api/upload/pdf` | Process PDF evidence |
| Alerts | `GET /api/alerts` | Retrieve alerts |
| Reports | `POST /api/reports/generate` | Generate a PDF report |

For available routes, request schemas, and response formats, open the FastAPI Swagger UI at `/docs` while the backend is running.

---

## 🧪 Testing

Run backend tests using:

```bash
cd backend
python -m pytest tests/ -v
```

Run frontend checks using the scripts configured in `frontend/package.json`. For example, if a test script exists:

```bash
cd frontend
npm test
```

Recommended test coverage includes:

- Authentication and authorization.
- Input validation and file-upload limits.
- NLP extraction behavior.
- Graph construction and path finding.
- Alert rules and risk-score calculations.
- Database integration and error handling.
- PDF report generation.

---

## 🔒 Security & Responsible Use

CRIMENET is intended for lawful research, authorized investigative workflows, and academic demonstrations.

- Use only lawfully obtained data.
- Apply access controls to sensitive records and evidence.
- Maintain audit logs for sensitive operations.
- Validate uploaded files and restrict file sizes and formats.
- Treat automatically extracted entities and relationships as potentially inaccurate.
- Require human review before acting on generated alerts or risk scores.
- Avoid treating association, proximity, or graph centrality as evidence of guilt.
- Use fictional or properly anonymized datasets for public demonstrations.
- Assess applicable privacy, evidence-handling, and data-protection requirements before deployment.

The system is not a substitute for professional investigation, due process, or legal judgment.

---

## 🔮 Future Enhancements

Potential future development areas include:

- Advanced entity resolution and duplicate detection.
- Multilingual NLP support.
- Improved temporal and geospatial network analysis.
- Explainable alert scoring and provenance tracking.
- More comprehensive audit and access-control workflows.
- Containerized deployment and CI/CD automation.
- Expanded automated testing and performance monitoring.

These items are planned possibilities, not claims that the functionality is already implemented.

---

## 🤝 Contributing

Contributions, suggestions, and bug reports are welcome.

1. Fork the repository.
2. Create a feature branch.
3. Make your changes.
4. Run relevant tests.
5. Submit a pull request with a clear description.

Please do not include private investigative records, credentials, or sensitive personal information in issues or pull requests.

---

## 📄 License

Add your chosen open-source license in the `LICENSE` file before distributing the project. Until a license is specified, do not assume that others have permission to reuse, modify, or redistribute the code.

---

## 👨‍💻 Author

**Nitesh Singh**

Computer Engineering Student | AI & Software Development

GitHub: [@NITESH777RAJPUT](https://github.com/NITESH777RAJPUT)

---

**CRIMENET — Connecting Data. Discovering Relationships. Supporting Investigations.**

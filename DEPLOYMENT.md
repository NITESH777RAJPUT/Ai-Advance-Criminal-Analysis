# CRIMENET Production Deployment Guide

This guide describes how to deploy the **CRIMENET AI-Powered Criminal Network Analysis System** with:
- **Frontend**: Hosted on **Vercel** (Global Edge CDN for React 18 + Vite SPA).
- **Backend**: Hosted on **Render** (or any standard Linux Python host) for FastAPI, spaCy NLP, and NetworkX.
- **Databases**: Hosted on **MongoDB Atlas** and **Neo4j AuraDB** (or self-hosted managed instances).

---

## Architecture Overview

```
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│       Vercel (Frontend)         │  HTTPS    │     Render (FastAPI Backend)    │
│  - React 18 + Vite + Tailwind   │ ────────> │  - spaCy NLP Engine             │
│  - Root Directory: frontend     │  REST API │  - NetworkX Graph Analytics     │
│  - VITE_API_BASE_URL (points to │  (JWT)    │  - ReportLab PDF Engine         │
│    Render backend /api)         │           │  - CORS restricted to Vercel    │
└─────────────────────────────────┘           └────────────────┬────────────────┘
                                                               │
                                               TLS Connections │
                                                               v
                                              ┌─────────────────────────────────┐
                                              │   Managed Cloud Databases       │
                                              │   - Neo4j AuraDB (bolt+s://)    │
                                              │   - MongoDB Atlas (mongodb+srv:)│
                                              │   - Cloudinary (optional media) │
                                              └─────────────────────────────────┘
```

---

## Step 1: Deploy Backend on Render

1. Log in to your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** and select **Web Service**.
3. Connect your Git repository.
4. Configure the Web Service settings:
   - **Name**: `crimenet-backend`
   - **Root Directory**: Leave blank or set to `.`
   - **Environment**: `Python 3`
   - **Region**: Choose the region closest to your users / database.
   - **Branch**: `main`
   - **Build Command**:
     ```bash
     cd backend && pip install -r requirements.txt && python -m spacy download en_core_web_sm
     ```
   - **Start Command**:
     ```bash
     cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT
     ```
   *(Note: If you choose "Deploy with Blueprint", Render will automatically detect the provided `render.yaml`)*.

5. In the **Environment Variables** tab, add the following variables:
   | Variable Name | Example / Description | Required? |
   | :--- | :--- | :--- |
   | `ENVIRONMENT` | `production` | Yes |
   | `DEBUG` | `False` | Yes |
   | `JWT_SECRET_KEY` | *(Generate a 64-char random hex string)* | Yes |
   | `JWT_ALGORITHM` | `HS256` | Yes |
   | `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` | Yes |
   | `CORS_ORIGINS` | `https://your-crimenet-app.vercel.app` *(update once Vercel URL is known)* | Yes |
   | `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/criminal_intelligence?retryWrites=true&w=majority` | Yes (or fallback) |
   | `NEO4J_URI` | `neo4j+s://<dbid>.databases.neo4j.io` | Yes (or fallback) |
   | `NEO4J_USERNAME` | `neo4j` | Yes |
   | `NEO4J_PASSWORD` | *(Your AuraDB password)* | Yes |
   | `CLOUDINARY_CLOUD_NAME` | *(Your Cloudinary cloud name)* | Optional |
   | `CLOUDINARY_API_KEY` | *(Your Cloudinary API key)* | Optional |
   | `CLOUDINARY_API_SECRET` | *(Your Cloudinary API secret)* | Optional |

6. Click **Create Web Service**. Wait for the build and deployment to succeed.
7. Note down your Render backend public URL, e.g.:
   `https://crimenet-backend.onrender.com`
   Verify it by opening `https://crimenet-backend.onrender.com/health` in your browser.

---

## Step 2: Deploy Frontend on Vercel

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** $\rightarrow$ **Project**.
3. Import your Git repository.
4. On the **Configure Project** screen:
   - **Project Name**: `crimenet` (or your preferred name).
   - **Framework Preset**: Select **Vite**.
   - **Root Directory**: Click **Edit** and select **`frontend`**.
   - **Build and Output Settings**:
     - Build Command: `npm run build` (Default)
     - Output Directory: `dist` (Default)
     - Install Command: `npm install` (Default)
5. Expand **Environment Variables** and add:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `VITE_API_BASE_URL` | `https://crimenet-backend.onrender.com/api` | Full URL to backend `/api` endpoint *(replace with your actual Render URL)* |

6. Click **Deploy**. Vercel will install dependencies, compile the production bundle via Vite, and publish to its global edge network.
7. Once deployed, Vercel will assign a production domain, e.g.:
   `https://crimenet-production.vercel.app`

---

## Step 3: Link CORS Origins

1. Return to your Render backend dashboard $\rightarrow$ **Environment**.
2. Update `CORS_ORIGINS` to include your exact Vercel production domain:
   ```
   CORS_ORIGINS=https://crimenet-production.vercel.app
   ```
   *(The backend also automatically permits all preview deployments matching `https://.*\.vercel\.app` when `vercel.app` is detected in `CORS_ORIGINS`)*.
3. Save changes; Render will redeploy with updated CORS rules in ~30 seconds.

---

## Step 4: Verification & Smoke Test

1. Open your Vercel URL in your browser: `https://crimenet-production.vercel.app`.
2. Verify direct SPA navigation: refresh the page on `/network` or `/alerts` — verify it loads without `404 Not Found` (guaranteed by `vercel.json` rewrite).
3. Log in with the standard credentials:
   - **Investigator**: `investigator@intelligence.gov` / `Investigator@123`
   - **Admin**: `admin@intelligence.gov` / `Admin@123`
4. Test the pipeline:
   - Navigate to **Network Graph**: verify nodes and edges render on Cytoscape.
   - Navigate to **Upload Center**: submit an FIR text or PDF file; verify NER extraction feed and provenance badges.
   - Navigate to **Report Generator**: click **Download Dossier**; verify PDF generation and download.
   - Navigate to **Alert Center**: verify suspicious activity alerts triage.

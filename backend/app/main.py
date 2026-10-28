import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api import admin, ai, alerts, auth, dashboard, entities, graph, reports, upload
from app.database.mongodb import mongo_client
from app.database.neo4j_client import neo4j_client
from app.services.auth_service import AuthService
from app.utils.config import settings
from app.utils.logger import get_logger

logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Initializing Criminal Intelligence Platform...")
    await mongo_client.connect()
    await neo4j_client.connect()
    await AuthService.seed_default_users()

    # Automatically load demo intelligence if graph has zero entities
    raw_g = neo4j_client.get_raw_graph()
    if len(raw_g.nodes) == 0:
        logger.info("Intelligence network empty on startup; seeding baseline Operation ShadowNet syndicate dataset...")
        from seed_data import seed_complete_syndicate
        await seed_complete_syndicate()

    yield

    # Shutdown
    logger.info("Shutting down Criminal Intelligence Platform...")
    await neo4j_client.disconnect()
    await mongo_client.disconnect()


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=(
        "AI-Powered Criminal Intelligence Platform that analyzes crime data, "
        "extracts entities & relationships via spaCy NLP, builds a criminal network graph in Neo4j, "
        "detects suspicious patterns, and delivers investigator analytics."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware - Enforce configured origins with credentials support
# In production on Vercel, set CORS_ORIGINS=https://your-app.vercel.app in backend environment
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    allow_origin_regex=r"https://.*\.vercel\.app" if "vercel.app" in settings.CORS_ORIGINS else None,
)

# Mount local media directory for evidence storage fallback
uploads_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/api/uploads/media", StaticFiles(directory=uploads_dir), name="media")

# Include API Routers with /api prefix
api_prefix = "/api"
app.include_router(auth.router, prefix=api_prefix)
app.include_router(upload.router, prefix=api_prefix)
app.include_router(entities.router, prefix=api_prefix)
app.include_router(graph.router, prefix=api_prefix)
app.include_router(alerts.router, prefix=api_prefix)
app.include_router(reports.router, prefix=api_prefix)
app.include_router(dashboard.router, prefix=api_prefix)
app.include_router(admin.router, prefix=api_prefix)
app.include_router(ai.router, prefix=api_prefix)


@app.get("/health")
async def health_check():
    return {
        "status": "operational",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "databases": {
            "mongodb": "connected" if mongo_client.is_connected else "in-memory-fallback",
            "neo4j": "connected" if neo4j_client.is_connected else "in-memory-networkx-fallback"
        }
    }


@app.get("/")
async def root():
    return {
        "message": "Welcome to AI-Powered Criminal Network Analysis Platform",
        "documentation": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)


# ai-service/main.py
import asyncio
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from src.config.settings import settings
from src.config.models import ModelManager
from src.api.main import api_router
from src.utils.logger import logger




@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestionnaire de cycle de vie de l'application"""
    # Startup
    logger.info("🚀 Starting AI Service...")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Models cache: {settings.model_cache_dir}")
    
    # Initialiser les modèles
    model_manager = ModelManager()
    await model_manager.initialize()
    app.state.model_manager = model_manager
    
    logger.info("✅ AI Service started successfully")
    
    yield
    
    # Shutdown
    logger.info("🛑 Shutting down AI Service...")
    if hasattr(app.state, 'model_manager'):
        await app.state.model_manager.cleanup()
    logger.info("✅ AI Service shutdown complete")


# Créer l'application FastAPI
app = FastAPI(
    title="Anonymiseur Juridique - AI Service",
    description="Service d'intelligence artificielle pour l'extraction d'entités nommées",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Routes API
app.include_router(api_router, prefix="/api/v1")

# Route de santé simple
@app.get("/health")
async def health_check():
    """Check de santé du service"""
    return {
        "status": "healthy",
        "service": "ai-service",
        "version": "1.0.0",
        "models_loaded": hasattr(app.state, 'model_manager') and app.state.model_manager.is_ready()
    }

# Route racine
@app.get("/")
async def root():
    """Page d'accueil du service IA"""
    return {
        "message": "Anonymiseur Juridique - AI Service",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.environment == "development",
        log_level=settings.log_level.lower(),
        access_log=True
    )
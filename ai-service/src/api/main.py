# ai-service/src/api/main.py
from fastapi import APIRouter
from .routes.analyze import router as analyze_router
from .routes.search import router as search_router
from .routes.validate import router as validate_router

# Router principal de l'API
api_router = APIRouter()

# Inclure les routes
api_router.include_router(analyze_router, prefix="/analyze", tags=["analyze"])
api_router.include_router(search_router, prefix="/search", tags=["search"])
api_router.include_router(validate_router, prefix="/validate", tags=["validate"])

# Route d'information sur les modèles
@api_router.get("/models")
async def get_models_info(request):
    """Obtenir les informations sur les modèles chargés"""
    model_manager = request.app.state.model_manager
    return model_manager.get_model_info()

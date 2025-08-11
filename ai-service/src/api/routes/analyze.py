# ai-service/src/api/routes/analyze.py
import time
import asyncio
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel, Field

from ...processors.ner_processor import NERProcessor
from ...processors.entity_classifier import EntityClassifier
from ...processors.confidence_calculator import ConfidenceCalculator
from ...utils.logger import logger
from ...config.settings import settings

router = APIRouter()

# Modèles de données
class AnalyzeRequest(BaseModel):
    text: str = Field(..., max_length=settings.max_text_length)
    mode: str = Field(default="ner", description="Mode d'analyse: 'ner' ou 'hybrid'")
    language: str = Field(default="fr", description="Langue du texte")
    confidence_threshold: float = Field(default=0.5, ge=0.0, le=1.0)
    include_regex: bool = Field(default=True, description="Inclure les patterns regex")
    entity_types: Optional[List[str]] = Field(default=None, description="Types d'entités à extraire")

class EntityResult(BaseModel):
    text: str
    label: str
    start: int
    end: int
    confidence: float
    source: str  # 'ner' ou 'regex'

class AnalyzeResponse(BaseModel):
    entities: List[EntityResult]
    processing_time: float
    model_info: dict
    statistics: dict

def get_processors(request: Request):
    """Dependency pour obtenir les processeurs"""
    model_manager = request.app.state.model_manager
    
    if not model_manager.is_ready():
        raise HTTPException(status_code=503, detail="AI models not ready")
    
    return {
        'ner_processor': NERProcessor(model_manager),
        'entity_classifier': EntityClassifier(),
        'confidence_calculator': ConfidenceCalculator()
    }

@router.post("/", response_model=AnalyzeResponse)
async def analyze_text(
    request: AnalyzeRequest,
    req: Request,
    processors: dict = Depends(get_processors)
):
    """
    Analyser un texte pour extraire les entités nommées
    """
    start_time = time.time()
    
    try:
        logger.info(f"Analyzing text: {len(request.text)} characters, mode: {request.mode}")
        
        # Validation de la langue
        if request.language != "fr":
            logger.warning(f"Unsupported language: {request.language}, using French models")
        
        # Initialiser les processeurs
        ner_processor = processors['ner_processor']
        entity_classifier = processors['entity_classifier']
        confidence_calculator = processors['confidence_calculator']
        
        # 1. Extraction NER avec spaCy
        ner_entities = []
        if request.mode in ["ner", "hybrid"]:
            ner_entities = await ner_processor.extract_entities(
                text=request.text,
                entity_types=request.entity_types
            )
        
        # 2. Extraction avec patterns regex
        regex_entities = []
        if request.include_regex:
            regex_entities = await ner_processor.extract_regex_entities(request.text)
        
        # 3. Combiner et déduplicater
        all_entities = ner_entities + regex_entities
        deduplicated_entities = entity_classifier.deduplicate_entities(all_entities)
        
        # 4. Calculer les scores de confiance
        entities_with_confidence = confidence_calculator.calculate_confidence(
            deduplicated_entities, 
            request.text
        )
        
        # 5. Filtrer par seuil de confiance
        filtered_entities = [
            entity for entity in entities_with_confidence
            if entity.confidence >= request.confidence_threshold
        ]
        
        # 6. Formatter la réponse
        result_entities = [
            EntityResult(
                text=entity.text,
                label=entity.label,
                start=entity.start,
                end=entity.end,
                confidence=entity.confidence,
                source=entity.source
            )
            for entity in filtered_entities
        ]
        
        processing_time = time.time() - start_time
        
        # Statistiques
        statistics = {
            "total_entities": len(all_entities),
            "after_deduplication": len(deduplicated_entities),
            "after_filtering": len(filtered_entities),
            "entities_by_type": {},
            "entities_by_source": {"ner": 0, "regex": 0}
        }
        
        for entity in filtered_entities:
            # Par type
            statistics["entities_by_type"][entity.label] = \
                statistics["entities_by_type"].get(entity.label, 0) + 1
            # Par source
            statistics["entities_by_source"][entity.source] += 1
        
        model_manager = req.app.state.model_manager
        
        logger.info(f"Analysis complete: {len(result_entities)} entities found in {processing_time:.2f}s")
        
        return AnalyzeResponse(
            entities=result_entities,
            processing_time=processing_time,
            model_info=model_manager.get_model_info(),
            statistics=statistics
        )
        
    except Exception as e:
        logger.error(f"Analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@router.post("/batch")
async def analyze_batch(
    texts: List[str],
    req: Request,
    mode: str = "ner",
    confidence_threshold: float = 0.5,
    processors: dict = Depends(get_processors)
):
    """
    Analyser plusieurs textes en lot
    """
    start_time = time.time()
    
    try:
        logger.info(f"Batch analysis: {len(texts)} texts")
        
        if len(texts) > 10:  # Limite de sécurité
            raise HTTPException(status_code=400, detail="Maximum 10 texts per batch")
        
        # Traiter en parallèle
        tasks = []
        for i, text in enumerate(texts):
            request = AnalyzeRequest(
                text=text,
                mode=mode,
                confidence_threshold=confidence_threshold
            )
            task = analyze_text(request, req, processors)
            tasks.append(task)
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Séparer les succès des erreurs
        successful_results = []
        errors = []
        
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                errors.append({"index": i, "error": str(result)})
            else:
                successful_results.append({"index": i, "result": result})
        
        processing_time = time.time() - start_time
        
        return {
            "results": successful_results,
            "errors": errors,
            "processing_time": processing_time,
            "total_texts": len(texts),
            "successful": len(successful_results),
            "failed": len(errors)
        }
        
    except Exception as e:
        logger.error(f"Batch analysis error: {e}")
        raise HTTPException(status_code=500, detail=f"Batch analysis failed: {str(e)}")

@router.get("/supported-entities")
async def get_supported_entities():
    """
    Obtenir la liste des types d'entités supportées
    """
    return {
        "supported_entities": settings.supported_entities,
        "regex_patterns": list(settings.regex_patterns.keys()),
        "description": {
            "PERSON": "Noms de personnes",
            "ORG": "Organisations et entreprises",
            "LOC": "Lieux et localités",
            "GPE": "Entités géopolitiques",
            "DATE": "Dates",
            "EMAIL": "Adresses email",
            "PHONE": "Numéros de téléphone",
            "IBAN": "Codes IBAN",
            "SIREN": "Numéros SIREN",
            "SIRET": "Numéros SIRET"
        }
    }
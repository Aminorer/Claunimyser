# ai-service/src/config/models.py
import asyncio
import spacy
from typing import Optional, Dict, Any
from transformers import AutoTokenizer, AutoModelForTokenClassification
from sentence_transformers import SentenceTransformer

from .settings import settings
from ..utils.logger import logger


class ModelManager:
    """Gestionnaire des modèles NLP"""
    
    def __init__(self):
        self.spacy_model: Optional[spacy.Language] = None
        self.transformer_tokenizer = None
        self.transformer_model = None
        self.sentence_transformer: Optional[SentenceTransformer] = None
        self._initialized = False
        
    async def initialize(self):
        """Initialiser tous les modèles"""
        try:
            logger.info("🔄 Initializing AI models...")
            
            # Charger spaCy en priorité (plus rapide)
            await self._load_spacy_model()
            
            # Charger les autres modèles en parallèle si nécessaire
            if settings.environment == "production":
                await asyncio.gather(
                    self._load_transformer_model(),
                    self._load_sentence_transformer(),
                    return_exceptions=True
                )
            
            self._initialized = True
            logger.info("✅ All AI models loaded successfully")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize models: {e}")
            raise
    
    async def _load_spacy_model(self):
        """Charger le modèle spaCy français"""
        try:
            logger.info(f"Loading spaCy model: {settings.spacy_model}")
            
            # Vérifier si le modèle est installé
            try:
                self.spacy_model = spacy.load(settings.spacy_model)
            except OSError:
                logger.warning(f"Model {settings.spacy_model} not found, trying to download...")
                import subprocess
                subprocess.run([
                    "python", "-m", "spacy", "download", settings.spacy_model
                ], check=True)
                self.spacy_model = spacy.load(settings.spacy_model)
            
            # Configurer le pipeline
            if "ner" not in self.spacy_model.pipe_names:
                logger.warning("NER component not found in spaCy model")
            
            logger.info(f"✅ spaCy model loaded: {len(self.spacy_model.pipe_names)} components")
            
        except Exception as e:
            logger.error(f"❌ Failed to load spaCy model: {e}")
            # Fallback vers un modèle plus petit
            try:
                logger.info("Trying fallback model: fr_core_news_sm")
                self.spacy_model = spacy.load("fr_core_news_sm")
                logger.info("✅ Fallback spaCy model loaded")
            except:
                raise Exception("No compatible spaCy model available")
    
    async def _load_transformer_model(self):
        """Charger le modèle Transformer (optionnel)"""
        try:
            logger.info(f"Loading Transformer model: {settings.transformer_model}")
            
            self.transformer_tokenizer = AutoTokenizer.from_pretrained(
                settings.transformer_model,
                cache_dir=f"{settings.model_cache_dir}/transformers"
            )
            
            self.transformer_model = AutoModelForTokenClassification.from_pretrained(
                settings.transformer_model,
                cache_dir=f"{settings.model_cache_dir}/transformers"
            )
            
            logger.info("✅ Transformer model loaded")
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to load Transformer model: {e}")
            # Non-critique, on peut continuer sans
    
    async def _load_sentence_transformer(self):
        """Charger le modèle de similarité sémantique (optionnel)"""
        try:
            logger.info(f"Loading Sentence Transformer: {settings.sentence_transformer_model}")
            
            self.sentence_transformer = SentenceTransformer(
                settings.sentence_transformer_model,
                cache_folder=f"{settings.model_cache_dir}/sentence_transformers"
            )
            
            logger.info("✅ Sentence Transformer loaded")
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to load Sentence Transformer: {e}")
            # Non-critique pour la recherche sémantique
    
    def is_ready(self) -> bool:
        """Vérifier si les modèles sont prêts"""
        return self._initialized and self.spacy_model is not None
    
    def get_spacy_model(self) -> spacy.Language:
        """Obtenir le modèle spaCy"""
        if not self.spacy_model:
            raise RuntimeError("spaCy model not loaded")
        return self.spacy_model
    
    def get_model_info(self) -> Dict[str, Any]:
        """Obtenir les informations sur les modèles chargés"""
        return {
            "spacy": {
                "model": settings.spacy_model,
                "loaded": self.spacy_model is not None,
                "components": list(self.spacy_model.pipe_names) if self.spacy_model else [],
                "version": spacy.__version__
            },
            "transformer": {
                "model": settings.transformer_model,
                "loaded": self.transformer_model is not None,
            },
            "sentence_transformer": {
                "model": settings.sentence_transformer_model,
                "loaded": self.sentence_transformer is not None,
            },
            "cache_dir": settings.model_cache_dir,
            "initialized": self._initialized
        }
    
    async def cleanup(self):
        """Nettoyer les modèles en mémoire"""
        logger.info("🧹 Cleaning up models...")
        
        # spaCy se nettoie automatiquement
        self.spacy_model = None
        
        # Nettoyer les modèles Transformer si chargés
        if hasattr(self, 'transformer_model'):
            del self.transformer_model
            del self.transformer_tokenizer
        
        if hasattr(self, 'sentence_transformer'):
            del self.sentence_transformer
        
        self._initialized = False
        logger.info("✅ Models cleanup complete")


# Instance globale du gestionnaire de modèles
model_manager = ModelManager()
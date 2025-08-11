# ai-service/src/config/settings.py
import os
from typing import List
from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    """Configuration du service IA"""
    
    # Application
    app_name: str = "AI Service - Anonymiseur Juridique"
    environment: str = Field(default="development", env="ENVIRONMENT")
    host: str = Field(default="0.0.0.0", env="HOST")
    port: int = Field(default=8000, env="PORT")
    
    # Logging
    log_level: str = Field(default="INFO", env="LOG_LEVEL")
    
    # CORS
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://localhost:5000"],
        env="CORS_ORIGINS"
    )
    
    # Modèles NLP
    spacy_model: str = Field(default="fr_core_news_lg", env="SPACY_MODEL")
    transformer_model: str = Field(
        default="dbmdz/bert-base-french-europeana-cased",
        env="TRANSFORMER_MODEL"
    )
    sentence_transformer_model: str = Field(
        default="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2",
        env="SENTENCE_TRANSFORMER_MODEL"
    )
    
    # Cache et stockage
    model_cache_dir: str = Field(default="./models", env="MODEL_CACHE_DIR")
    redis_url: str = Field(default="redis://localhost:6379", env="REDIS_URL")
    
    # Paramètres NER
    confidence_threshold: float = Field(default=0.7, env="CONFIDENCE_THRESHOLD")
    max_text_length: int = Field(default=1000000, env="MAX_TEXT_LENGTH")  # 1MB de texte
    batch_size: int = Field(default=32, env="BATCH_SIZE")
    
    # Performance
    enable_gpu: bool = Field(default=False, env="ENABLE_GPU")
    max_workers: int = Field(default=4, env="MAX_WORKERS")
    cache_predictions: bool = Field(default=True, env="CACHE_PREDICTIONS")
    cache_ttl: int = Field(default=3600, env="CACHE_TTL")  # 1 heure
    
    # Entités supportées
    supported_entities: List[str] = Field(
        default=[
            "PERSON",      # Personnes
            "ORG",         # Organisations
            "LOC",         # Lieux
            "GPE",         # Entités géopolitiques
            "DATE",        # Dates
            "MONEY",       # Montants
            "EMAIL",       # Emails (regex)
            "PHONE",       # Téléphones (regex)
            "IBAN",        # IBAN (regex)
            "SIREN",       # SIREN (regex)
            "SIRET",       # SIRET (regex)
        ],
        env="SUPPORTED_ENTITIES"
    )
    
    # Patterns regex français
    regex_patterns: dict = {
        "EMAIL": r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b',
        "PHONE": r'(?:\+33|0)[1-9](?:[.\-\s]?\d{2}){4}',
        "IBAN": r'\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}[A-Z0-9]{1,16}\b',
        "SIREN": r'\b\d{3}\s?\d{3}\s?\d{3}\b',
        "SIRET": r'\b\d{3}\s?\d{3}\s?\d{3}\s?\d{5}\b',
        "DATE_FR": r'\b(?:\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4})\b',
        "ADDRESS_FR": r'\b\d+[\s,]+(?:rue|avenue|boulevard|place|allée|impasse|chemin|route)[^,\n]+(?:\d{5}|(?:Paris|Lyon|Marseille|Toulouse|Nice|Nantes|Strasbourg|Montpellier|Bordeaux|Lille))',
    }
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Instance globale des paramètres
settings = Settings()


# Création des dossiers nécessaires
def create_directories():
    """Créer les dossiers nécessaires"""
    import os
    
    directories = [
        settings.model_cache_dir,
        f"{settings.model_cache_dir}/spacy",
        f"{settings.model_cache_dir}/transformers",
        f"{settings.model_cache_dir}/sentence_transformers",
        "./logs",
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)


# Initialiser les dossiers au chargement
create_directories()
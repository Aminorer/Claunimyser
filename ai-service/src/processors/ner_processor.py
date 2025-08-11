# ai-service/src/processors/ner_processor.py
import re
import spacy
from typing import List, Optional, Dict, Any
from dataclasses import dataclass

from ..config.settings import settings
from ..utils.logger import logger

@dataclass
class Entity:
    """Représentation d'une entité détectée"""
    text: str
    label: str
    start: int
    end: int
    confidence: float
    source: str  # 'ner' ou 'regex'
    context: Optional[str] = None

class NERProcessor:
    """Processeur pour l'extraction d'entités nommées"""
    
    def __init__(self, model_manager):
        self.model_manager = model_manager
        self.regex_patterns = self._compile_regex_patterns()
        
    def _compile_regex_patterns(self) -> Dict[str, re.Pattern]:
        """Compiler les patterns regex"""
        compiled_patterns = {}
        for name, pattern in settings.regex_patterns.items():
            try:
                compiled_patterns[name] = re.compile(pattern, re.IGNORECASE)
            except re.error as e:
                logger.warning(f"Invalid regex pattern for {name}: {e}")
        return compiled_patterns
    
    async def extract_entities(
        self, 
        text: str, 
        entity_types: Optional[List[str]] = None
    ) -> List[Entity]:
        """
        Extraire les entités avec spaCy NER
        """
        try:
            nlp = self.model_manager.get_spacy_model()
            
            # Limiter la taille du texte pour éviter les problèmes de mémoire
            if len(text) > settings.max_text_length:
                logger.warning(f"Text too long ({len(text)} chars), truncating to {settings.max_text_length}")
                text = text[:settings.max_text_length]
            
            # Traitement spaCy
            doc = nlp(text)
            entities = []
            
            for ent in doc.ents:
                # Filtrer par types si spécifié
                if entity_types and ent.label_ not in entity_types:
                    continue
                
                # Mapper les labels spaCy vers nos types
                mapped_label = self._map_spacy_label(ent.label_)
                if not mapped_label:
                    continue
                
                # Calculer le contexte
                context = self._extract_context(text, ent.start_char, ent.end_char)
                
                entity = Entity(
                    text=ent.text.strip(),
                    label=mapped_label,
                    start=ent.start_char,
                    end=ent.end_char,
                    confidence=0.8,  # Score de base pour spaCy, sera recalculé
                    source="ner",
                    context=context
                )
                
                entities.append(entity)
            
            logger.info(f"spaCy NER extracted {len(entities)} entities")
            return entities
            
        except Exception as e:
            logger.error(f"NER extraction error: {e}")
            return []
    
    async def extract_regex_entities(self, text: str) -> List[Entity]:
        """
        Extraire les entités avec patterns regex
        """
        entities = []
        
        try:
            for pattern_name, compiled_pattern in self.regex_patterns.items():
                # Mapper le nom du pattern vers notre type d'entité
                entity_type = self._map_regex_pattern_to_entity_type(pattern_name)
                if not entity_type:
                    continue
                
                # Trouver toutes les correspondances
                for match in compiled_pattern.finditer(text):
                    # Valider la correspondance
                    if self._validate_regex_match(match.group(), entity_type):
                        context = self._extract_context(text, match.start(), match.end())
                        
                        entity = Entity(
                            text=match.group().strip(),
                            label=entity_type,
                            start=match.start(),
                            end=match.end(),
                            confidence=0.9,  # Score élevé pour regex, sera ajusté
                            source="regex",
                            context=context
                        )
                        
                        entities.append(entity)
            
            logger.info(f"Regex extraction found {len(entities)} entities")
            return entities
            
        except Exception as e:
            logger.error(f"Regex extraction error: {e}")
            return []
    
    def _map_spacy_label(self, spacy_label: str) -> Optional[str]:
        """
        Mapper les labels spaCy vers nos types d'entités
        """
        mapping = {
            "PER": "PERSON",
            "PERSON": "PERSON",
            "ORG": "ORG",
            "LOC": "LOC",
            "GPE": "LOC",  # Geopolitical entity
            "MISC": "ORG",  # Miscellaneous -> Organisation par défaut
            "DATE": "DATE",
            "TIME": "DATE",
            "MONEY": "MONEY",
            "PERCENT": "MONEY",
        }
        
        return mapping.get(spacy_label.upper())
    
    def _map_regex_pattern_to_entity_type(self, pattern_name: str) -> Optional[str]:
        """
        Mapper les noms de patterns regex vers nos types d'entités
        """
        mapping = {
            "EMAIL": "EMAIL",
            "PHONE": "PHONE",
            "IBAN": "IBAN",
            "SIREN": "SIREN",
            "SIRET": "SIRET",
            "DATE_FR": "DATE",
            "ADDRESS_FR": "ADDRESS",
        }
        
        return mapping.get(pattern_name)
    
    def _validate_regex_match(self, match_text: str, entity_type: str) -> bool:
        """
        Valider une correspondance regex
        """
        # Règles de validation spécifiques par type
        if entity_type == "EMAIL":
            # Vérifier que ce n'est pas juste des caractères spéciaux
            return "@" in match_text and "." in match_text.split("@")[1]
        
        elif entity_type == "PHONE":
            # Vérifier qu'il y a suffisamment de chiffres
            digits = re.sub(r'[^\d]', '', match_text)
            return len(digits) >= 10
        
        elif entity_type == "IBAN":
            # Vérifier la longueur et le format
            clean_iban = re.sub(r'[\s-]', '', match_text)
            return len(clean_iban) >= 15
        
        elif entity_type in ["SIREN", "SIRET"]:
            # Vérifier que c'est bien des chiffres
            digits = re.sub(r'[^\d]', '', match_text)
            expected_length = 9 if entity_type == "SIREN" else 14
            return len(digits) == expected_length
        
        # Par défaut, accepter la correspondance
        return True
    
    def _extract_context(self, text: str, start: int, end: int, window: int = 50) -> str:
        """
        Extraire le contexte autour d'une entité
        """
        context_start = max(0, start - window)
        context_end = min(len(text), end + window)
        
        context = text[context_start:context_end]
        
        # Indiquer où se trouve l'entité dans le contexte
        entity_text = text[start:end]
        context_with_marker = context.replace(
            entity_text, 
            f"[{entity_text}]", 
            1
        )
        
        return context_with_marker.strip()

# ai-service/src/processors/entity_classifier.py
import re
from typing import List, Set, Tuple
from difflib import SequenceMatcher

from ..utils.logger import logger
from .ner_processor import Entity

class EntityClassifier:
    """Classificateur et déduplicateur d'entités"""
    
    def __init__(self):
        self.similarity_threshold = 0.8
    
    def deduplicate_entities(self, entities: List[Entity]) -> List[Entity]:
        """
        Déduplicater les entités overlappantes ou similaires
        """
        if not entities:
            return []
        
        # Trier par position
        sorted_entities = sorted(entities, key=lambda e: (e.start, e.end))
        deduplicated = []
        
        for entity in sorted_entities:
            # Vérifier les overlaps avec les entités déjà ajoutées
            if not self._has_significant_overlap(entity, deduplicated):
                deduplicated.append(entity)
            else:
                # Garder la meilleure entité en cas d'overlap
                overlapping_entity = self._find_overlapping_entity(entity, deduplicated)
                if overlapping_entity and self._should_replace(entity, overlapping_entity):
                    # Remplacer l'entité existante
                    deduplicated = [e for e in deduplicated if e != overlapping_entity]
                    deduplicated.append(entity)
        
        logger.info(f"Deduplication: {len(entities)} -> {len(deduplicated)} entities")
        return deduplicated
    
    def _has_significant_overlap(self, entity: Entity, existing_entities: List[Entity]) -> bool:
        """
        Vérifier si une entité a un overlap significatif avec les entités existantes
        """
        for existing in existing_entities:
            overlap = self._calculate_overlap(entity, existing)
            if overlap > 0.5:  # Plus de 50% d'overlap
                return True
        return False
    
    def _calculate_overlap(self, entity1: Entity, entity2: Entity) -> float:
        """
        Calculer le pourcentage d'overlap entre deux entités
        """
        start_overlap = max(entity1.start, entity2.start)
        end_overlap = min(entity1.end, entity2.end)
        
        if start_overlap >= end_overlap:
            return 0.0
        
        overlap_length = end_overlap - start_overlap
        entity1_length = entity1.end - entity1.start
        entity2_length = entity2.end - entity2.start
        
        # Calculer le pourcentage par rapport à la plus petite entité
        min_length = min(entity1_length, entity2_length)
        return overlap_length / min_length if min_length > 0 else 0.0
    
    def _find_overlapping_entity(self, entity: Entity, existing_entities: List[Entity]) -> Entity:
        """
        Trouver l'entité qui overlap avec l'entité donnée
        """
        for existing in existing_entities:
            if self._calculate_overlap(entity, existing) > 0.5:
                return existing
        return None
    
    def _should_replace(self, new_entity: Entity, existing_entity: Entity) -> bool:
        """
        Déterminer si on doit remplacer une entité existante par une nouvelle
        """
        # Priorité au score de confiance
        if abs(new_entity.confidence - existing_entity.confidence) > 0.1:
            return new_entity.confidence > existing_entity.confidence
        
        # En cas d'égalité, priorité au regex (plus précis)
        if new_entity.source == "regex" and existing_entity.source == "ner":
            return True
        
        # Priorité à l'entité la plus longue (plus de contexte)
        new_length = new_entity.end - new_entity.start
        existing_length = existing_entity.end - existing_entity.start
        
        return new_length > existing_length
    
    def group_similar_entities(self, entities: List[Entity]) -> List[List[Entity]]:
        """
        Grouper les entités similaires
        """
        groups = []
        processed = set()
        
        for i, entity in enumerate(entities):
            if i in processed:
                continue
            
            group = [entity]
            processed.add(i)
            
            # Chercher des entités similaires
            for j, other_entity in enumerate(entities[i+1:], i+1):
                if j in processed:
                    continue
                
                if self._are_similar_entities(entity, other_entity):
                    group.append(other_entity)
                    processed.add(j)
            
            groups.append(group)
        
        return groups
    
    def _are_similar_entities(self, entity1: Entity, entity2: Entity) -> bool:
        """
        Vérifier si deux entités sont similaires
        """
        # Même type requis
        if entity1.label != entity2.label:
            return False
        
        # Similarité textuelle
        similarity = SequenceMatcher(None, entity1.text.lower(), entity2.text.lower()).ratio()
        return similarity >= self.similarity_threshold
    
    def classify_entity_quality(self, entity: Entity) -> str:
        """
        Classifier la qualité d'une entité
        """
        if entity.confidence >= 0.9:
            return "high"
        elif entity.confidence >= 0.7:
            return "medium"
        elif entity.confidence >= 0.5:
            return "low"
        else:
            return "very_low"

# ai-service/src/processors/confidence_calculator.py
import re
from typing import List, Dict
from ..utils.logger import logger
from .ner_processor import Entity

class ConfidenceCalculator:
    """Calculateur de scores de confiance pour les entités"""
    
    def __init__(self):
        # Patterns pour ajuster la confiance
        self.quality_patterns = {
            "PERSON": {
                "high": [
                    r'^[A-Z][a-z]+ [A-Z][a-z]+,  # Prénom Nom
                    r'^[A-Z][a-z]+-[A-Z][a-z]+ [A-Z][a-z]+,  # Jean-Pierre Martin
                ],
                "low": [
                    r'^[A-Z]+,  # Tout en majuscules
                    r'^\d',  # Commence par un chiffre
                ]
            },
            "ORG": {
                "high": [
                    r'(SARL|SAS|SA|EURL|SCI|SASU)',  # Types de sociétés
                    r'(Société|Entreprise|Compagnie)',
                ],
                "low": [
                    r'^[a-z]+,  # Tout en minuscules
                ]
            },
            "EMAIL": {
                "high": [r'@.*\.(com|fr|org|net|edu)],
                "low": [r'@.*\.(test|example|localhost)]
            }
        }
        
        # Mots de contexte qui renforcent la confiance
        self.context_boosters = {
            "PERSON": ["monsieur", "madame", "docteur", "professeur", "maître"],
            "ORG": ["société", "entreprise", "compagnie", "association", "fondation"],
            "LOC": ["ville", "commune", "département", "région", "pays"],
        }
    
    def calculate_confidence(self, entities: List[Entity], full_text: str) -> List[Entity]:
        """
        Calculer les scores de confiance pour toutes les entités
        """
        updated_entities = []
        
        for entity in entities:
            # Score de base selon la source
            base_confidence = self._get_base_confidence(entity)
            
            # Ajustements selon la qualité du texte
            quality_adjustment = self._calculate_quality_adjustment(entity)
            
            # Ajustements selon le contexte
            context_adjustment = self._calculate_context_adjustment(entity, full_text)
            
            # Ajustements selon la longueur
            length_adjustment = self._calculate_length_adjustment(entity)
            
            # Score final
            final_confidence = min(1.0, max(0.1, 
                base_confidence + quality_adjustment + context_adjustment + length_adjustment
            ))
            
            # Créer une nouvelle entité avec le score mis à jour
            updated_entity = Entity(
                text=entity.text,
                label=entity.label,
                start=entity.start,
                end=entity.end,
                confidence=round(final_confidence, 3),
                source=entity.source,
                context=entity.context
            )
            
            updated_entities.append(updated_entity)
        
        logger.info(f"Confidence calculated for {len(updated_entities)} entities")
        return updated_entities
    
    def _get_base_confidence(self, entity: Entity) -> float:
        """
        Score de confiance de base selon la source
        """
        base_scores = {
            "regex": 0.85,  # Regex très fiables pour les patterns structurés
            "ner": 0.75,    # spaCy généralement bon mais parfois des faux positifs
            "manual": 0.95  # Ajouts manuels très fiables
        }
        
        return base_scores.get(entity.source, 0.5)
    
    def _calculate_quality_adjustment(self, entity: Entity) -> float:
        """
        Ajustement basé sur la qualité du texte de l'entité
        """
        adjustment = 0.0
        entity_type = entity.label
        
        if entity_type in self.quality_patterns:
            patterns = self.quality_patterns[entity_type]
            
            # Vérifier les patterns de haute qualité
            for pattern in patterns.get("high", []):
                if re.search(pattern, entity.text, re.IGNORECASE):
                    adjustment += 0.1
                    break
            
            # Vérifier les patterns de basse qualité
            for pattern in patterns.get("low", []):
                if re.search(pattern, entity.text, re.IGNORECASE):
                    adjustment -= 0.2
                    break
        
        # Ajustements génériques
        # Pénaliser les entités trop courtes (sauf pour les codes)
        if len(entity.text) < 3 and entity_type not in ["IBAN", "SIREN", "SIRET"]:
            adjustment -= 0.1
        
        # Pénaliser les entités avec beaucoup de caractères spéciaux
        special_char_ratio = len(re.findall(r'[^\w\s]', entity.text)) / len(entity.text)
        if special_char_ratio > 0.3:
            adjustment -= 0.1
        
        return adjustment
    
    def _calculate_context_adjustment(self, entity: Entity, full_text: str) -> float:
        """
        Ajustement basé sur le contexte autour de l'entité
        """
        adjustment = 0.0
        
        if not entity.context:
            return adjustment
        
        entity_type = entity.label
        context_lower = entity.context.lower()
        
        # Vérifier les mots de contexte qui renforcent
        if entity_type in self.context_boosters:
            for booster in self.context_boosters[entity_type]:
                if booster in context_lower:
                    adjustment += 0.05
        
        # Contexte spécifique pour les emails
        if entity_type == "EMAIL":
            if any(word in context_lower for word in ["contact", "mail", "courriel", "@"]):
                adjustment += 0.05
        
        # Contexte pour les numéros de téléphone
        if entity_type == "PHONE":
            if any(word in context_lower for word in ["téléphone", "tel", "mobile", "portable"]):
                adjustment += 0.05
        
        return min(0.2, adjustment)  # Limiter l'ajustement contextuel
    
    def _calculate_length_adjustment(self, entity: Entity) -> float:
        """
        Ajustement basé sur la longueur de l'entité
        """
        length = len(entity.text)
        entity_type = entity.label
        
        # Longueurs optimales par type d'entité
        optimal_ranges = {
            "PERSON": (5, 30),
            "ORG": (3, 50),
            "LOC": (3, 25),
            "EMAIL": (5, 50),
            "PHONE": (10, 15),
            "IBAN": (15, 34),
            "SIREN": (9, 11),  # Avec espaces
            "SIRET": (14, 17), # Avec espaces
        }
        
        if entity_type in optimal_ranges:
            min_len, max_len = optimal_ranges[entity_type]
            
            if min_len <= length <= max_len:
                return 0.05  # Bonus pour longueur optimale
            elif length < min_len:
                return -0.1   # Pénalité pour trop court
            elif length > max_len * 1.5:
                return -0.1   # Pénalité pour trop long
        
        return 0.0

// backend-api/src/services/aiService.ts
import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';
import { DetectedEntity, EntityType } from './documentService';

export interface AIEntityResponse {
  entities: Array<{
    text: string;
    label: string;
    start: number;
    end: number;
    confidence: number;
  }>;
  processing_time: number;
  model_info: {
    name: string;
    version: string;
  };
}

export interface AISearchResponse {
  results: Array<{
    text: string;
    start: number;
    end: number;
    context: string;
    similarity: number;
  }>;
}

export class AIService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.aiService.url,
      timeout: config.aiService.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Intercepteurs pour logging
    this.client.interceptors.request.use(
      (config) => {
        logger.info(`AI Service request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('AI Service request error:', error);
        return Promise.reject(error);
      }
    );

    this.client.interceptors.response.use(
      (response) => {
        logger.info(`AI Service response: ${response.status} - ${response.config.url}`);
        return response;
      },
      (error) => {
        logger.error('AI Service response error:', error.response?.status, error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Extraction d'entités avec IA
   */
  async extractEntities(text: string, mode: string = 'ner'): Promise<DetectedEntity[]> {
    try {
      logger.info(`Extracting entities with AI (mode: ${mode})`);

      const response = await this.client.post<AIEntityResponse>('/analyze', {
        text,
        mode,
        language: 'fr',
        confidence_threshold: 0.5,
        include_regex: true, // Inclure aussi les patterns regex
      });

      const aiEntities = response.data.entities;
      
      // Convertir au format interne
      const entities: DetectedEntity[] = aiEntities.map((entity, index) => ({
        id: `ai_${entity.label.toLowerCase()}_${Date.now()}_${index}`,
        type: this.mapAILabelToEntityType(entity.label),
        value: entity.text,
        replacement: this.generateReplacement(this.mapAILabelToEntityType(entity.label), entity.text),
        confidence: entity.confidence,
        source: 'ner',
        page: Math.ceil(entity.start / 3000), // Estimation page
        startPos: entity.start,
        endPos: entity.end,
        isModified: false,
      }));

      logger.info(`AI extracted ${entities.length} entities in ${response.data.processing_time}ms`);
      
      return entities;

    } catch (error) {
      logger.error('AI entity extraction error:', error);
      
      // Fallback vers regex si IA indisponible
      logger.warn('Falling back to regex extraction due to AI service error');
      throw new Error(`AI service unavailable: ${error.message}`);
    }
  }

  /**
   * Recherche sémantique dans le texte
   */
  async searchSemantic(text: string, query: string): Promise<AISearchResponse> {
    try {
      const response = await this.client.post<AISearchResponse>('/search', {
        text,
        query,
        mode: 'semantic',
        max_results: 20,
      });

      return response.data;

    } catch (error) {
      logger.error('AI semantic search error:', error);
      throw new Error(`Semantic search failed: ${error.message}`);
    }
  }

  /**
   * Validation et amélioration d'entités
   */
  async validateEntities(entities: DetectedEntity[]): Promise<DetectedEntity[]> {
    try {
      const response = await this.client.post('/validate', {
        entities: entities.map(entity => ({
          text: entity.value,
          type: entity.type,
          confidence: entity.confidence,
        })),
      });

      // Mettre à jour les scores de confiance
      const validatedEntities = entities.map((entity, index) => ({
        ...entity,
        confidence: response.data.entities[index]?.confidence || entity.confidence,
      }));

      return validatedEntities;

    } catch (error) {
      logger.error('AI validation error:', error);
      // Retourner les entités originales en cas d'erreur
      return entities;
    }
  }

  /**
   * Suggestions de groupement automatique
   */
  async suggestGroups(entities: DetectedEntity[]): Promise<Array<{
    name: string;
    entities: string[];
    confidence: number;
  }>> {
    try {
      const response = await this.client.post('/suggest-groups', {
        entities: entities.map(entity => ({
          id: entity.id,
          text: entity.value,
          type: entity.type,
        })),
      });

      return response.data.groups;

    } catch (error) {
      logger.error('AI group suggestion error:', error);
      return []; // Retourner array vide en cas d'erreur
    }
  }

  /**
   * Test de connectivité avec le service IA
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch (error) {
      logger.error('AI service health check failed:', error);
      return false;
    }
  }

  /**
   * Mapping des labels IA vers nos types d'entités
   */
  private mapAILabelToEntityType(label: string): EntityType {
    const mapping: Record<string, EntityType> = {
      'PER': 'PERSON',
      'PERSON': 'PERSON',
      'ORG': 'ORG',
      'ORGANIZATION': 'ORG',
      'LOC': 'LOC',
      'LOCATION': 'LOC',
      'GPE': 'LOC', // Geopolitical entity
      'EMAIL': 'EMAIL',
      'PHONE': 'PHONE',
      'DATE': 'DATE',
      'IBAN': 'IBAN',
      'SIREN': 'SIREN',
      'SIRET': 'SIRET',
      'ADDRESS': 'ADDRESS',
    };

    return mapping[label.toUpperCase()] || 'LOC'; // Fallback
  }

  /**
   * Génération des valeurs de remplacement (similaire à DocumentService)
   */
  private generateReplacement(type: EntityType, value: string): string {
    switch (type) {
      case 'EMAIL':
        const [local, domain] = value.split('@');
        return `${local.replace(/./g, 'X')}@${domain.replace(/[^.]/g, 'X')}`;
      
      case 'PHONE':
        return value.replace(/\d/g, 'X');
      
      case 'IBAN':
        return value.substring(0, 4) + value.substring(4).replace(/./g, 'X');
      
      case 'SIREN':
      case 'SIRET':
        return value.replace(/\d/g, 'X');
      
      case 'DATE':
        return value.replace(/\d/g, 'X');
      
      case 'ADDRESS':
        return value.replace(/\d+/g, 'XXX').replace(/[A-Za-zÀ-ÿ]/g, 'X');
      
      case 'LOC':
        return 'LIEU_XXX';
      
      case 'PERSON':
        return 'PERSONNE_XXX';
      
      case 'ORG':
        return 'ORGANISATION_XXX';
      
      default:
        return 'XXX';
    }
  }

  /**
   * Obtenir les informations sur les modèles disponibles
   */
  async getModelInfo(): Promise<any> {
    try {
      const response = await this.client.get('/models');
      return response.data;
    } catch (error) {
      logger.error('Failed to get model info:', error);
      return null;
    }
  }
}
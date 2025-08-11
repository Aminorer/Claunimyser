// backend-api/src/services/documentService.ts
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { logger } from '../utils/logger';

export interface DocumentContent {
  text: string;
  pages: number;
  metadata: {
    wordCount: number;
    format: string;
    extractedAt: string;
  };
  structure?: {
    paragraphs: string[];
    formatting?: any;
  };
}

export interface DetectedEntity {
  id: string;
  type: EntityType;
  value: string;
  replacement: string;
  confidence?: number;
  source: 'regex' | 'ner' | 'manual';
  page: number;
  startPos: number;
  endPos: number;
  isModified: boolean;
}

export type EntityType = 'PERSON' | 'ORG' | 'LOC' | 'ADDRESS' | 'EMAIL' | 'PHONE' | 'DATE' | 'IBAN' | 'SIREN' | 'SIRET';

export class DocumentService {
  
  /**
   * Extraction du contenu d'un document (PDF ou DOCX)
   */
  async extractContent(buffer: Buffer, mimetype: string): Promise<DocumentContent> {
    try {
      if (mimetype.includes('pdf')) {
        return await this.extractPdfContent(buffer);
      } else if (mimetype.includes('word')) {
        return await this.extractDocxContent(buffer);
      } else {
        throw new Error(`Unsupported file type: ${mimetype}`);
      }
    } catch (error) {
      logger.error('Content extraction error:', error);
      throw new Error(`Failed to extract content: ${error.message}`);
    }
  }

  /**
   * Extraction contenu PDF
   */
  private async extractPdfContent(buffer: Buffer): Promise<DocumentContent> {
    const data = await pdfParse(buffer);
    
    const text = data.text;
    const pages = data.numpages;
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;

    return {
      text,
      pages,
      metadata: {
        wordCount,
        format: 'pdf',
        extractedAt: new Date().toISOString(),
      },
      structure: {
        paragraphs: text.split('\n').filter(p => p.trim().length > 0),
      },
    };
  }

  /**
   * Extraction contenu DOCX
   */
  private async extractDocxContent(buffer: Buffer): Promise<DocumentContent> {
    const result = await mammoth.extractRawText(buffer);
    const text = result.value;
    
    // Estimation du nombre de pages (approximatif)
    const estimatedPages = Math.ceil(text.length / 3000);
    const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;

    return {
      text,
      pages: estimatedPages,
      metadata: {
        wordCount,
        format: 'docx',
        extractedAt: new Date().toISOString(),
      },
      structure: {
        paragraphs: text.split('\n').filter(p => p.trim().length > 0),
      },
    };
  }

  /**
   * Extraction d'entités avec patterns regex français optimisés
   */
  async extractEntitiesRegex(text: string): Promise<DetectedEntity[]> {
    const entities: DetectedEntity[] = [];
    let entityCounter = 0;

    // Patterns regex français optimisés
    const patterns = {
      EMAIL: {
        regex: /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g,
        type: 'EMAIL' as EntityType,
      },
      PHONE: {
        regex: /(?:\+33|0)[1-9](?:[.\-\s]?\d{2}){4}/g,
        type: 'PHONE' as EntityType,
      },
      IBAN: {
        regex: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}[A-Z0-9]{1,16}\b/g,
        type: 'IBAN' as EntityType,
      },
      SIREN: {
        regex: /\b\d{3}\s?\d{3}\s?\d{3}\b/g,
        type: 'SIREN' as EntityType,
      },
      SIRET: {
        regex: /\b\d{3}\s?\d{3}\s?\d{3}\s?\d{5}\b/g,
        type: 'SIRET' as EntityType,
      },
      DATE: {
        regex: /\b(?:\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+\d{4})\b/gi,
        type: 'DATE' as EntityType,
      },
      ADDRESS: {
        regex: /\b\d+[\s,]+(?:rue|avenue|boulevard|place|allée|impasse|chemin|route)[^,\n]+(?:\d{5}|(?:Paris|Lyon|Marseille|Toulouse|Nice|Nantes|Strasbourg|Montpellier|Bordeaux|Lille|Rennes|Reims|Le Havre|Saint-Étienne|Toulon|Grenoble|Dijon|Angers|Nîmes|Villeurbanne))/gi,
        type: 'ADDRESS' as EntityType,
      },
      LOC: {
        regex: /\b(?:Paris|Lyon|Marseille|Toulouse|Nice|Nantes|Strasbourg|Montpellier|Bordeaux|Lille|Rennes|Reims|Le Havre|Saint-Étienne|Toulon|Grenoble|Dijon|Angers|Nîmes|Villeurbanne|France|Belgique|Suisse|Luxembourg)\b/g,
        type: 'LOC' as EntityType,
      },
    };

    // Extraction avec chaque pattern
    Object.entries(patterns).forEach(([name, config]) => {
      let match;
      while ((match = config.regex.exec(text)) !== null) {
        const entity: DetectedEntity = {
          id: `regex_${name.toLowerCase()}_${++entityCounter}`,
          type: config.type,
          value: match[0],
          replacement: this.generateReplacement(config.type, match[0]),
          source: 'regex',
          page: Math.ceil(match.index / 3000), // Estimation page
          startPos: match.index,
          endPos: match.index + match[0].length,
          isModified: false,
        };
        
        entities.push(entity);
      }
    });

    logger.info(`Extracted ${entities.length} entities with regex`);
    return entities;
  }

  /**
   * Génération de document anonymisé
   */
  async generateAnonymizedDocument(
    document: any,
    entities: DetectedEntity[],
    format: string = 'docx',
    options: any = {}
  ): Promise<Buffer> {
    try {
      if (format === 'docx') {
        return await this.generateDocxAnonymized(document, entities, options);
      } else {
        throw new Error(`Export format ${format} not supported yet`);
      }
    } catch (error) {
      logger.error('Document generation error:', error);
      throw new Error(`Failed to generate document: ${error.message}`);
    }
  }

  /**
   * Génération DOCX anonymisé
   */
  private async generateDocxAnonymized(
    document: any,
    entities: DetectedEntity[],
    options: any
  ): Promise<Buffer> {
    let anonymizedText = document.content.text;

    // Trier les entités par position (ordre décroissant pour éviter les décalages)
    const sortedEntities = [...entities].sort((a, b) => b.startPos - a.startPos);

    // Remplacer les entités
    sortedEntities.forEach(entity => {
      const before = anonymizedText.substring(0, entity.startPos);
      const after = anonymizedText.substring(entity.endPos);
      anonymizedText = before + entity.replacement + after;
    });

    // Créer le document DOCX
    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            // Ajouter filigrane si demandé
            ...(options.includeWatermark ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "DOCUMENT ANONYMISÉ",
                    color: "CCCCCC",
                    size: 12,
                  }),
                ],
              }),
            ] : []),
            
            // Contenu principal
            ...anonymizedText.split('\n').map(line => 
              new Paragraph({
                children: [
                  new TextRun({
                    text: line || ' ', // Éviter les paragraphes vides
                    size: 24, // 12pt
                  }),
                ],
              })
            ),

            // Rapport d'audit si demandé
            ...(options.includeAuditReport ? [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "\n\n--- RAPPORT D'ANONYMISATION ---",
                    bold: true,
                    size: 28,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Entités anonymisées: ${entities.length}`,
                    size: 24,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Date de traitement: ${new Date().toLocaleString('fr-FR')}`,
                    size: 24,
                  }),
                ],
              }),
            ] : []),
          ],
        },
      ],
    });

    // Générer le buffer
    const buffer = await Packer.toBuffer(doc);
    return buffer;
  }

  /**
   * Génération des valeurs de remplacement
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
   * Validation du fichier uploadé
   */
  validateFile(file: any): { isValid: boolean; error?: string } {
    const maxSize = 25 * 1024 * 1024; // 25MB
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!file) {
      return { isValid: false, error: 'No file provided' };
    }

    if (file.size > maxSize) {
      return { isValid: false, error: 'File too large (max 25MB)' };
    }

    if (!allowedTypes.includes(file.mimetype)) {
      return { isValid: false, error: 'Invalid file type (only PDF and DOCX allowed)' };
    }

    return { isValid: true };
  }
}
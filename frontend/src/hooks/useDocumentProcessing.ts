import { useCallback } from 'react';
import { useStores } from '../stores';
import { ProcessingMode, DetectedEntity, EntityType } from '../stores';

// Simulation de l'extraction d'entités avec regex
const ENTITY_PATTERNS = {
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  PHONE: /(?:\+33|0)[1-9](?:[.\-\s]?\d{2}){4}/g,
  DATE: /\b(?:\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\b/g,
  IBAN: /\b[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}[A-Z0-9]{1,16}\b/g,
  SIREN: /\b\d{3}\s?\d{3}\s?\d{3}\b/g,
  SIRET: /\b\d{3}\s?\d{3}\s?\d{3}\s?\d{5}\b/g,
};

const generateReplacement = (type: EntityType, value: string): string => {
  switch (type) {
    case 'EMAIL':
      const [local, domain] = value.split('@');
      return `${local.replace(/./g, 'X')}@${domain.replace(/[^.]/g, 'X')}`;
    case 'PHONE':
      return value.replace(/\d/g, 'X');
    case 'DATE':
      return value.replace(/\d/g, 'X');
    case 'IBAN':
      return value.substring(0, 4) + value.substring(4).replace(/./g, 'X');
    case 'SIREN':
    case 'SIRET':
      return value.replace(/\d/g, 'X');
    case 'PERSON':
      return 'PERSONNE_XXX';
    case 'ADDRESS':
      return 'ADRESSE_XXX';
    case 'LOC':
      return 'LIEU_XXX';
    case 'ORG':
      return 'ORGANISATION_XXX';
    default:
      return 'XXX';
  }
};

export const useDocumentProcessing = () => {
  const { document, entities, ui } = useStores();

  const processFile = useCallback(async (
    file: File,
    mode: ProcessingMode,
    onProgress?: (step: string, progress: number) => void
  ) => {
    try {
      // Validation
      onProgress?.('Validation du fichier', 10);
      if (file.size > 25 * 1024 * 1024) {
        throw new Error('Fichier trop volumineux (max 25MB)');
      }

      // Lecture du fichier
      onProgress?.('Lecture du document', 30);
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => reject(new Error('Erreur de lecture'));
        reader.readAsText(file);
      });

      // Création du document
      const processedDoc = {
        id: `doc_${Date.now()}`,
        filename: file.name,
        format: file.type.includes('word') ? 'docx' as const : 'pdf' as const,
        size: file.size,
        content,
        uploadedAt: new Date(),
      };

      document.setDocument(processedDoc);
      document.setProcessingMode(mode);

      // Analyse des entités
      onProgress?.('Analyse des entités', 60);
      const detectedEntities: DetectedEntity[] = [];
      let entityCounter = 0;

      if (mode === 'regex') {
        // Extraction avec patterns regex
        Object.entries(ENTITY_PATTERNS).forEach(([type, pattern]) => {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            detectedEntities.push({
              id: `entity_${++entityCounter}`,
              type: type as EntityType,
              value: match[0],
              replacement: generateReplacement(type as EntityType, match[0]),
              source: 'regex',
              page: Math.ceil(match.index / 3000),
              isModified: false,
            });
          }
        });
      } else {
        // Mode IA - simulation avec données plus complexes
        const aiEntities = [
          { type: 'PERSON', value: 'Jean Dupont', confidence: 0.95 },
          { type: 'PERSON', value: 'Marie Martin', confidence: 0.88 },
          { type: 'ORG', value: 'ABC CONSEIL', confidence: 0.92 },
          { type: 'ORG', value: 'XYZ INDUSTRIE', confidence: 0.85 },
          { type: 'ADDRESS', value: '123 Rue de la Paix, 75001 Paris', confidence: 0.90 },
        ];

        aiEntities.forEach((entity, index) => {
          if (content.toLowerCase().includes(entity.value.toLowerCase())) {
            detectedEntities.push({
              id: `entity_ai_${++entityCounter}`,
              type: entity.type as EntityType,
              value: entity.value,
              replacement: generateReplacement(entity.type as EntityType, entity.value),
              confidence: entity.confidence,
              source: 'ner',
              page: Math.ceil(Math.random() * 3) + 1,
              isModified: false,
            });
          }
        });

        // Ajouter aussi les entités regex
        Object.entries(ENTITY_PATTERNS).forEach(([type, pattern]) => {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            detectedEntities.push({
              id: `entity_${++entityCounter}`,
              type: type as EntityType,
              value: match[0],
              replacement: generateReplacement(type as EntityType, match[0]),
              confidence: 0.75,
              source: 'regex',
              page: Math.ceil(match.index / 3000),
              isModified: false,
            });
          }
        });
      }

      // Ajouter les entités au store
      detectedEntities.forEach(entity => {
        entities.addEntity(entity);
      });

      onProgress?.('Finalisation', 90);
      await new Promise(resolve => setTimeout(resolve, 500));

      onProgress?.('Terminé', 100);

      ui.addNotification({
        type: 'success',
        message: `${detectedEntities.length} entités détectées avec succès`,
      });

      return processedDoc;
    } catch (error) {
      ui.addNotification({
        type: 'error',
        message: `Erreur: ${error.message}`,
      });
      throw error;
    }
  }, [document, entities, ui]);

  const exportDocument = useCallback(async () => {
    try {
      const currentDoc = document.currentDoc;
      const currentEntities = entities.entities;

      if (!currentDoc) {
        throw new Error('Aucun document à exporter');
      }

      ui.addNotification({
        type: 'info',
        message: 'Génération du document anonymisé...',
      });

      // Simulation de l'export
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Créer un blob simulé
      let anonymizedContent = currentDoc.content;
      currentEntities.forEach(entity => {
        anonymizedContent = anonymizedContent.replace(new RegExp(entity.value, 'g'), entity.replacement);
      });

      const blob = new Blob([anonymizedContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      // Téléchargement
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentDoc.filename.replace(/\.[^/.]+$/, '')}_anonymise.txt`;
      link.click();
      
      URL.revokeObjectURL(url);

      ui.addNotification({
        type: 'success',
        message: 'Document anonymisé généré avec succès !',
      });

    } catch (error) {
      ui.addNotification({
        type: 'error',
        message: `Erreur lors de l'export: ${error.message}`,
      });
    }
  }, [document, entities, ui]);

  return { processFile, exportDocument };
};
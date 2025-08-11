import { useCallback } from 'react';
import { useStores } from '../stores/useStores';
import { DocumentService, EntityService } from '../services/api';
import { DocumentProcessor, EntityExtractor } from '../utils';

export const useDocumentProcessing = () => {
  const { document, entities, ui } = useStores();

  const processFile = useCallback(async (
    file: File,
    mode: 'regex' | 'ia',
    onProgress?: (step: string, progress: number) => void
  ) => {
    try {
      // Étape 1: Validation
      onProgress?.('Validation du fichier', 10);
      const validation = DocumentProcessor.validateFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      // Étape 2: Upload
      onProgress?.('Upload du document', 20);
      const { documentId } = await DocumentService.uploadDocument(file);

      // Étape 3: Lecture du document
      onProgress?.('Lecture du document', 40);
      let documentData;
      if (file.type.includes('word')) {
        documentData = await DocumentProcessor.readDocxFile(file);
      } else {
        documentData = await DocumentProcessor.readPdfFile(file);
      }

      const processedDoc = {
        id: documentId,
        filename: file.name,
        format: file.type.includes('word') ? 'docx' as const : 'pdf' as const,
        size: file.size,
        content: documentData.content,
        structure: documentData.structure,
        metadata: documentData.metadata,
        uploadedAt: new Date(),
      };

      document.setDocument(processedDoc);

      // Étape 4: Analyse des entités
      onProgress?.('Analyse des entités', 60);
      let detectedEntities;
      
      if (mode === 'regex') {
        detectedEntities = EntityExtractor.extractWithRegex(documentData.content);
      } else {
        detectedEntities = await EntityService.detectEntitiesAI(documentData.content);
      }

      // Ajouter les entités au store
      detectedEntities.forEach(entity => {
        entities.addEntity(entity);
      });

      // Étape 5: Finalisation
      onProgress?.('Préparation de l\'interface', 90);
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulation

      onProgress?.('Terminé', 100);
      
      return processedDoc;
    } catch (error) {
      ui.addNotification({
        type: 'error',
        message: `Erreur lors du traitement: ${error.message}`,
      });
      throw error;
    }
  }, [document, entities, ui]);

  const exportDocument = useCallback(async (options: any) => {
    try {
      ui.addNotification({
        type: 'info',
        message: 'Génération du document anonymisé en cours...',
      });

      const currentDoc = document.currentDoc;
      const currentEntities = entities.entities;

      if (!currentDoc) {
        throw new Error('Aucun document à exporter');
      }

      const blob = await DocumentService.downloadAnonymizedDocument(
        currentDoc.id,
        currentEntities,
        options
      );

      // Créer une URL de téléchargement
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${currentDoc.filename.replace(/\.[^/.]+$/, '')}_anonymise.docx`;
      link.click();

      // Nettoyer
      URL.revokeObjectURL(url);

      ui.addNotification({
        type: 'success',
        message: 'Document anonymisé généré avec succès !',
      });

      return url;
    } catch (error) {
      ui.addNotification({
        type: 'error',
        message: `Erreur lors de l'export: ${error.message}`,
      });
      throw error;
    }
  }, [document, entities, ui]);

  return {
    processFile,
    exportDocument,
  };
};
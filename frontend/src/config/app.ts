export const APP_CONFIG = {
  // Limites
  MAX_FILE_SIZE: 25 * 1024 * 1024, // 25MB
  SUPPORTED_FORMATS: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  MAX_ENTITIES_PER_DOCUMENT: 10000,
  MAX_GROUPS_PER_DOCUMENT: 100,
  
  // API
  API_TIMEOUT: 30000, // 30 secondes
  UPLOAD_CHUNK_SIZE: 1024 * 1024, // 1MB chunks
  
  // UI
  NOTIFICATION_AUTO_CLOSE_DELAY: 5000,
  ZOOM_MIN: 50,
  ZOOM_MAX: 200,
  ZOOM_STEP: 10,
  
  // Traitement
  CONFIDENCE_THRESHOLD_DEFAULT: 0.7,
  CONFIDENCE_THRESHOLD_MIN: 0.1,
  CONFIDENCE_THRESHOLD_MAX: 1.0,
  
  // Export
  EXPORT_FORMATS: ['docx'] as const,
  WATERMARK_TEXT: 'Document anonymisé',
  
  // Sessions
  SESSION_TIMEOUT: 2 * 60 * 60 * 1000, // 2 heures
  AUTO_SAVE_INTERVAL: 30 * 1000, // 30 secondes
};

// Types pour la configuration
export type AppConfig = typeof APP_CONFIG;
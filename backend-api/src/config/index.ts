// backend-api/src/config/index.ts
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000'),
  
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    sessionTTL: 2 * 60 * 60, // 2 heures pour les sessions temporaires
  },
  
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '26214400'), // 25MB
    allowedMimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  
  aiService: {
    url: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    timeout: parseInt(process.env.AI_SERVICE_TIMEOUT || '30000'),
  },
  
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // requêtes par IP
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

// Validation basique
if (!config.aiService.url) {
  throw new Error('AI_SERVICE_URL is required');
}
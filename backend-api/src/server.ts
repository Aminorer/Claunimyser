// backend-api/src/server.ts
import app from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { connectRedis } from './config/redis';

const startServer = async () => {
  try {
    // Connexion à Redis (pour cache temporaire)
    await connectRedis();
    logger.info('✅ Redis connected');

    // Démarrage du serveur
    const server = app.listen(config.port, () => {
      logger.info(`🚀 Server running on port ${config.port}`);
      logger.info(`📡 AI Service: ${config.aiService.url}`);
    });

    // Gestion gracieuse de l'arrêt
    const gracefulShutdown = (signal: string) => {
      logger.info(`${signal} received. Shutting down...`);
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
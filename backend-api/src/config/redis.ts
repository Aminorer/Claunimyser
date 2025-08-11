// backend-api/src/config/redis.ts
import Redis from 'ioredis';
import { config } from './index';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;

export const connectRedis = async (): Promise<Redis> => {
  try {
    if (redisClient) {
      return redisClient;
    }

    redisClient = new Redis(config.redis.url, {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      commandTimeout: 5000,
    });

    // Event listeners
    redisClient.on('connect', () => {
      logger.info('✅ Redis connected successfully');
    });

    redisClient.on('ready', () => {
      logger.info('✅ Redis ready to receive commands');
    });

    redisClient.on('error', (error) => {
      logger.error('❌ Redis connection error:', error);
    });

    redisClient.on('close', () => {
      logger.warn('⚠️ Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('🔄 Redis reconnecting...');
    });

    // Test de connexion
    await redisClient.ping();
    logger.info('✅ Redis ping successful');

    return redisClient;

  } catch (error) {
    logger.error('❌ Failed to connect to Redis:', error);
    throw error;
  }
};

export const getRedisClient = (): Redis => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      logger.info('✅ Redis disconnected successfully');
    } catch (error) {
      logger.error('❌ Error disconnecting Redis:', error);
    }
  }
};
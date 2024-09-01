import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'audio-response-service' },
  transports: [
    new winston.transports.Console(),
  ],
});

export const createRequestLogger = () => {
  const requestSessionId = uuidv4();
  return {
    info: (message: string, meta: object = {}) => logger.info(message, { ...meta, correlationId: requestSessionId }),
    warn: (message: string, meta: object = {}) => logger.warn(message, { ...meta, correlationId: requestSessionId }),
    error: (message: string, meta: object = {}) => logger.error(message, { ...meta, correlationId: requestSessionId }),
    debug: (message: string, meta: object = {}) => logger.debug(message, { ...meta, correlationId: requestSessionId }),
  };
};

export default logger;
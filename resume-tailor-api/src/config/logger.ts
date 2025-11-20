import pino, { type LoggerOptions } from 'pino';
import { isProduction } from './env.js';

const loggerOptions: LoggerOptions = {
  level: isProduction ? 'info' : 'debug'
};

if (!isProduction) {
  loggerOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard'
    }
  };
}

export const logger = pino(loggerOptions);

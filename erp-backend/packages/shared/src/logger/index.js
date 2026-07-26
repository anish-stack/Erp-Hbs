'use strict';

const path = require('path');
const fs = require('fs');
const winston = require('winston');
const env = require('../config/env');

const LOG_DIR = env.str('LOG_DIR', path.resolve(process.cwd(), 'logs'));
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const serviceName = env.str('SERVICE_NAME', 'erp-service');

const baseFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.splat()
);

const consoleFormat = winston.format.combine(
  baseFormat,
  winston.format.colorize({ level: true }),
  winston.format.printf(({ timestamp, level, message, stack, service, ...meta }) => {
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${service}] ${level}: ${stack || message}${extra}`;
  })
);

const fileFormat = winston.format.combine(baseFormat, winston.format.json());

const logger = winston.createLogger({
  level: env.str('LOG_LEVEL', 'info'),
  defaultMeta: { service: serviceName },
  transports: [
    new winston.transports.Console({ format: consoleFormat }),
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10485760,
      maxFiles: 10
    }),
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      format: fileFormat,
      maxsize: 20971520,
      maxFiles: 10
    })
  ],
  exitOnError: false
});

logger.stream = {
  write: (message) => logger.info(String(message).trim())
};

module.exports = logger;

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logDirectory = path.join(__dirname, '../logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
  fs.chmodSync(logDirectory, 0o775); // Set appropriate permissions
}

// Set up winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss' // Use local system time
    }),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
  ),
  transports: [
    new winston.transports.File({ filename: path.join(logDirectory, 'app.log'), handleExceptions: true }),
    new winston.transports.Console({ handleExceptions: true })
  ],
  exitOnError: false
});

module.exports = logger;

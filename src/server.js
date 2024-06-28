require('dotenv').config();
const express = require('express');
const https = require('https');
const fs = require('fs');
const { MongoClient } = require('mongodb');
const generateIcs = require('ics-service/generate-ics');
const aboutRoute = require('ics-service/about');
const feedRoute = require('ics-service/feed');
const path = require('path');
const cron = require('node-cron');
const morgan = require('morgan');  // For logging HTTP requests
const winston = require('winston');  // For general logging

const TITLE = 'BA-Leipzig-Stundenplan';
const GENERATOR = 'BA-Leipzig-Stundenplan-Clone';

const userID = process.env.USER_ID;
const userHash = process.env.USER_HASH;
const dbUri = process.env.DB_URI;

// Create logs directory if it doesn't exist
const logDirectory = path.join(__dirname, 'logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

// Reminder
let alarms = [];
alarms.push({
  action: 'display',
  description: 'Erinnerung an die Veranstaltung',
  trigger: { minutes: 5, before: true },
});

// Set up winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
  ),
  transports: [
    new winston.transports.File({ filename: path.join(logDirectory, 'app.log') }),
    new winston.transports.Console()
  ]
});

let db;
const connectToMongoDB = async () => {
  try {
    const client = await MongoClient.connect(dbUri, { useNewUrlParser: true, useUnifiedTopology: true });
    db = client.db();
    logger.info('Connected to MongoDB');
    fetchAndSaveEvents(); // Call this after the DB connection is established
  } catch (err) {
    logger.error('Failed to connect to MongoDB', err);
  }
};

const app = express();
const PORT = process.env.NODE_PORT_INTERN || 3003;

// Set up morgan to use winston for HTTP request logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

const campusDualFetcher = async (userID, userHash) => {
  const OPTIONS = {
    host: 'selfservice.campus-dual.de',
    path: `/room/json?userid=${userID}&hash=${userHash}&start=1719180000&end=1719784800&_=1719562909338`,
    ca: fs.readFileSync(path.join(__dirname, 'campusdual-cert-chain.pem')),
    json: true
  };

  let res_str;
  try {
    return new Promise((resolve, reject) => {
      https.get(OPTIONS, function (res) {
        res.setEncoding('utf8');
        res_str = '';

        res
          .on('data', (chunk) => {
            res_str += chunk;
          })
          .on('end', () => {
            resolve(res_str);
          })
          .on('error', (err) => {
            reject(err);
          });
      });
    });
  } catch (err) {
    logger.error(err);
  }
};

const fetchAndSaveEvents = async () => {
  console.time('fetchAndSaveEvents');
  try {
    const data = await campusDualFetcher(userID, userHash);
    const events = JSON.parse(data);

    const collection = db.collection('events');
    for (const event of events) {
      const existingEvent = await collection.findOne({ title: event.title, start: event.start, end: event.end });
      if (!existingEvent) {
        await collection.insertOne(event);
      }
    }
    logger.info('Events fetched and saved to MongoDB');
  } catch (error) {
    logger.error('Error fetching or saving events:', error);
  }
  console.timeEnd('fetchAndSaveEvents');
};

// Schedule tasks to be run on the server every 10 minutes
cron.schedule('*/10 * * * *', () => {
  logger.info('Running a job every 10 minutes');
  fetchAndSaveEvents();
});

const convertTimestampToICalDate = (timestamp) => {
  const date = new Date(timestamp * 1000);
  return [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1, // Months are zero indexed in JS
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  ];
};

const convertToICalEvents = (jsonEvents) => {
  return jsonEvents.map(event => ({
    title: event.title,
    description: event.description,
    location: event.room,
    start: convertTimestampToICalDate(event.start),
    end: convertTimestampToICalDate(event.end),
    status: 'CONFIRMED',
    productId: GENERATOR,
    alarms: alarms,
  }));
};

const getIcs = async (feedUrl) => {
  try {
    const events = await db.collection('events').find().toArray();
    const iCalEvents = convertToICalEvents(events);
    return generateIcs(TITLE, iCalEvents, feedUrl);
  } catch (error) {
    logger.error('Error generating iCal events:', error);
    throw error;
  }
};

app.use('/feed', feedRoute(getIcs));
app.use('/', aboutRoute(TITLE));

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`API available at: http://localhost:${PORT}/feed`);
});

connectToMongoDB(); // Initiate MongoDB connection

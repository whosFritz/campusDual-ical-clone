require('dotenv').config();
const express = require('express');
const https = require('https');
const fs = require('fs');
const generateIcs = require('ics-service/generate-ics');
const path = require('path');
const morgan = require('morgan'); // For logging HTTP requests
const winston = require('winston'); // For general logging

const TITLE = 'BA-Leipzig-Stundenplan';
const GENERATOR = 'BA-Leipzig-Stundenplan-Clone';

// Create logs directory if it doesn't exist
const logDirectory = path.join(__dirname, '../logs');
if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
  fs.chmodSync(logDirectory, 0o775); // Set appropriate permissions
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
            if (res.statusCode === 200) {
              resolve(res_str);
            } else {
              reject(new Error(`Status code: ${res.statusCode}`));
            }
          })
          .on('error', (err) => {
            reject(err);
          });
      });
    });
  } catch (err) {
    logger.error(`Error in campusDualFetcher for user ${userID}: ${err}`);
    throw err;
  }
};

const convertTimestampToICalDate = (timestamp) => {
  const date = new Date(timestamp * 1000);
  return [
    date.getFullYear(),
    date.getMonth() + 1, // Months are zero indexed in JS
    date.getDate(),
    date.getHours(),
    date.getMinutes(),
    date.getSeconds()
  ];
};

const convertToICalEvents = (jsonEvents) => {
  return jsonEvents.map(event => ({
    title: event.title + ' - ' + event.instructor,
    description: event.description,
    location: event.room,
    start: convertTimestampToICalDate(event.start),
    end: convertTimestampToICalDate(event.end),
    status: 'CONFIRMED',
    productId: GENERATOR,
    alarms: alarms,
  }));
};

const getIcs = async (events, feedUrl) => {
  try {
    const iCalEvents = convertToICalEvents(events);
    return generateIcs(TITLE, iCalEvents, feedUrl);
  } catch (error) {
    logger.error('Error generating iCal events:', error);
    throw error;
  }
};

// Custom basic authentication middleware
const customAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.setHeader('WWW-Authenticate', 'Basic realm="User Visible Realm"');
    return res.sendStatus(401);
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [userid, userhash] = credentials.split(':');

  logger.info(`Received credentials: userID=${userid}`);

  try {
    const data = await campusDualFetcher(userid, userhash);
    const events = JSON.parse(data);
    if (events && events.length > 0) {
      req.events = events;
      logger.info(`Authentication complete. Giving data from campus dual to user`);
      return next();
    } else {
      logger.warn(`Invalid credentials for user ${userid}`);
      res.setHeader('WWW-Authenticate', 'Basic realm="User Visible Realm"');
      return res.sendStatus(401);
    }
  } catch (error) {
    logger.error(`Error during authentication for user ${userid}: ${error}`);
    res.setHeader('WWW-Authenticate', 'Basic realm="User Visible Realm"');
    res.sendStatus(401);
  }
};

app.get('/feed', customAuth, async (req, res) => {
  try {
    const icsContent = await getIcs(req.events, req.url);
    res.setHeader('Content-Disposition', 'attachment; filename=calendar.ics');
    res.setHeader('Content-Type', 'text/calendar');
    res.send(icsContent);
  } catch (error) {
    logger.error('Error sending iCal content:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.use('/', (req, res) => {
  const calendarUrl = `webcal://${req.headers.host}/feed`;
  res.send(`
  <html>
    <head>
    <title>BA-Leipzig-Stundenplan</title>
    </head>
    <body>
      <h1>BA-Leipzig-Stundenplan</h1>
      <p>Click the link below to add the calendar feed to your calendar application:</p>
      <a href="${calendarUrl}">Add to Calendar</a>
      <p>This calendar feed is supported on macOS, iOS, and iPadOS. If the calendar app does not open automatically, you can add the calendar manually by following these steps:</p>
      <ul>
        <li>Open the Calendar app.</li>
        <li>Go to "File" > "New Calendar Subscription".</li>
        <li>Enter the following URL: <code>${calendarUrl}</code></li>
      </ul>
      <p>For more details, visit the <a href="https://github.com/whosFritz/campusDual-ical-clone/">GitHub page</a>.</p>
      <p>Your traffic is encrypted, and the application does not save your data, only transfers it.</p>
      <p>To use this service, you need your User ID and Hash:</p>
      <ul>
        <li>Your User ID resembles the numbers in your student ID.</li>
        <li>You can find your Hash by following the guide in this <a href="https://github.com/MaRcR11/ba-schedule/blob/main/README.md">README</a>.</li>
      </ul>
      <p>For questions or feedback, please open an issue on the <a href="https://github.com/whosFritz/campusDual-ical-clone/issues">GitHub repository</a>.</p>
      <p>Note: If you want to sync the calendar through the iCloud account, you will be prompted by your other devices to log in with your student credentials when entering the corresponding app.</p>
      <p>Author: whosFritz</p>
    </body>
  </html>
  `);
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`API available at: http://localhost:${PORT}/feed`);
});

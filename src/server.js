require('dotenv').config();
const express = require('express');
const path = require('path');
const logger = require('./logger');
const { customAuth } = require('./middleware');
const { getIcs } = require('./icsUtils');

// Create Express app
const app = express();
const PORT = process.env.NODE_PORT_INTERN || 3003;

// Route for HTML page
app.get('/', (req, res) => {
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

// Route for iCal feed
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

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`API available at: http://localhost:${PORT}/feed`);
});

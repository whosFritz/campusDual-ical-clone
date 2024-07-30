require('dotenv').config();
const express = require('express');
const path = require('path');
const logger = require('./logger');
const { customAuth } = require('./middleware');
const { getIcs } = require('./icsUtils');

// Create Express app
const app = express();
const PORT = process.env.NODE_PORT_INTERN || 3003;

// Route for HTML page with Bootstrap
app.get('/', (req, res) => {
  const calendarUrl = `webcal://${req.headers.host}/feed`;
  res.send(`
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BA-Leipzig-Stundenplan</title>
    <link href="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">
    <style>
      body {
        padding-top: 50px;
      }
      .container {
        max-width: 800px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="jumbotron">
        <h1 class="display-4">BA-Leipzig-Stundenplan</h1>
        <p class="lead">Click the link below to add the calendar feed to your calendar application:</p>
        <a class="btn btn-primary btn-lg" href="${calendarUrl}" role="button">Add to Calendar</a>
        <hr class="my-4">
        <p>This calendar feed is supported on macOS, iOS, and iPadOS. If the calendar app does not open automatically, you can add the calendar manually by following these steps:</p>
        <ul class="list-unstyled">
          <li>Open the Calendar app.</li>
          <li>Go to "File" > "New Calendar Subscription".</li>
          <li>Enter the following URL: <code>${calendarUrl}</code></li>
        </ul>
        <p>For more details, visit the <a href="https://github.com/whosFritz/campusDual-ical-clone/">GitHub page</a>.</p>
        <p>Your traffic is encrypted, and the application does not save your data, only transfers it.</p>
        <p>To use this service, you need your User ID and Hash:</p>
        <ul class="list-unstyled">
          <li>Your User ID resembles the numbers in your student ID.</li>
          <li>You can find your Hash by following the guide in this <a href="https://github.com/MaRcR11/ba-schedule/blob/main/README.md">README</a>.</li>
        </ul>
        <p>For questions or feedback, please open an issue on the <a href="https://github.com/whosFritz/campusDual-ical-clone/issues">GitHub repository</a>.</p>
        <p>Note: If you want to sync the calendar through the iCloud account, you will be prompted by your other devices to log in with your student credentials when entering the corresponding app.</p>
        <p>Author: whosFritz</p>
      </div>
    </div>

    <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.11.6/dist/umd/popper.min.js"></script>
    <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
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
  logger.info(`API available at: http://localhost:${PORT}/`);
});

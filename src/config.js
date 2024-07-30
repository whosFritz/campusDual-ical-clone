const path = require('path');

// Constants
const TITLE = 'BA-Leipzig-Stundenplan';
const GENERATOR = 'BA-Leipzig-Stundenplan-Clone';

// Reminder
const alarms = [];
alarms.push({
  action: 'display',
  description: 'Erinnerung an die Veranstaltung',
  trigger: { minutes: 5, before: true },
});

module.exports = { TITLE, GENERATOR, alarms };

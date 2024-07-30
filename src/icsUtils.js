const generateIcs = require('ics-service/generate-ics');
const { TITLE, GENERATOR, alarms } = require('./config');

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

module.exports = { getIcs };

const https = require('https');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

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

module.exports = campusDualFetcher;

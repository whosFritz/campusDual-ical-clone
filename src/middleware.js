const campusDualFetcher = require('./campusDualFetcher');
const logger = require('./logger');

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

module.exports = { customAuth };

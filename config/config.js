const APPROOT = require('app-root-path');
const os = require("os");

const hostname = os.hostname();
const logger = require(`${APPROOT}/util/logger`)(module);

// const path = require('path');
// const env = process.env.ENV || "dev";
// const config = require(APPROOT + '/config/config.json');


const configFile = require(`${APPROOT}/config/config.json`);
const configMode = configFile.run_mode;
const config = configFile[configMode];

if (configMode === 'prod') {
    config.LOG_OUT_FILEPATH = `/logs/solution/${hostname}/search/search.out.log`;
    // config['LOG_OUT_FILEPATH'] = "/logs/solution/"+hostname+"/search/search.out.log";
    config.LOG_ERROR_FILEPATH = `/logs/solution/${hostname}/search/search.error.log`;
    // config['LOG_ERROR_FILEPATH'] = "/logs/solution/"+hostname+"/search/search.error.log";
}

logger.info("############# CHECK CONFIG MODE #############");
logger.info(`# Service PORT ::: ${config.API_SERVICE_PORT}`);
logger.info(`# ELASTICHOST ::: ${config.ELASTICSEARCH_SE_HOST}`);

module.exports = config;


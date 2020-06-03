const APPROOT = require('app-root-path');
const logger = require(`${APPROOT}/util/logger`)(module);

const path   = require('path');
const env    = process.env.ENV || "dev";
//const config = require(APPROOT + '/config/config.json');


const configFile = require(`${APPROOT}/config/config.json`);
const configMode = configFile.run_mode;
const config = configFile[configMode];

logger.info("############# CHECK CONFIG MODE #############");
logger.info(`# Service PORT ::: ${config.app_server_default_port}`);
logger.info(`# ELASTICHOST ::: ${config.elastic_host}`);
logger.info(config);

module.exports = config;


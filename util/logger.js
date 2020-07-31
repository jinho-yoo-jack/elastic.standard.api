const APPROOT = require('app-root-path');
const path = require('path');
const moment = require('moment');
const winston = require('winston');
  // _winston_daily_rotate_file = require('winston-daily-rotate-file');

const config = require(`${APPROOT}/config/config.js`);

const cusLevels = {
  levels: {
    none: 0,
    info: 10,
    warn: 20,
    error: 30,
    debug: 40,
    verb: 50,
  },
  colors: {
    info: 'black',
    warn: 'yellow',
    error: 'red'
  }
};

winston.addColors(cusLevels.colors);

/**
 * Set Logging Formatter
 *
 * @param args
 * @returns {string}
 */
function formatter(args) {
  const datetime = moment().format('YYYY-MM-DDTHH:mm:ss.SSSZ');
  const level = `${args.level} `;
  const logLevel = level.slice(0, 5).toLocaleUpperCase();
  return `[${datetime}][${logLevel}]${args.message}`;
  // return '[' + datetime + '][' + (args.level + ' ').slice(0, 5).toLocaleUpperCase() + ']' + args.message
};

// Create winston.logger instance for wholesale reconfigure
const logger = winston.createLogger({
  // levels 는 config 파일 선택
  levels: cusLevels.levels,
  // Transports Log
  transports: [
    // # Setting Format Console Log
    new (winston.transports.Console)({
      name: 'console',
      level: config.LOG_MODE,
      colorize: true,
      showLevel: true,
      json: false,
      timestamp: true,
      format: winston.format.printf(info => formatter(info)),
      // formatter : formatter,
    })
  ]
});

// Constructor Function
function Hooks(args) {
  // console.log('hooks ::: ',args);
  // console.log('hooks instanceof ::: ', this instanceof hooks);
  if (!(this instanceof Hooks)) {
    return new Hooks(args);
  }

  // Find Executed Path
  // _path.sep : "/"
  // "", "Users","jinokku","Downloads","backup","api_service"
  const filepath = args.filename.split(path.sep);

  // return value : -1
  let index = 0;
  let clazz = '';
  while (index < filepath.length) {
    if (filepath[index] !== '') {
      clazz += '/';
      clazz += filepath[index];
      // clazz = clazz + filepath[index];
    }
    // index++;
    index += 1;
  }
  logger.info(clazz);
  this.clazz = clazz;

  return this;
}

Hooks.prototype.log = function log(level, msg, callback) {
  logger.log(level, `[${this.clazz}]${msg}`, callback);
};

Hooks.prototype.info = function info(msg, callback) {
  logger.info(`[${this.clazz}]${msg}`, callback);
};

Hooks.prototype.error = function error(msg, callback) {
  logger.error(`[${this.clazz}]${msg}`, callback);
};

module.exports = Hooks;



















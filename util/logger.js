const rootpath = require('app-root-path');
const _path = require('path');
const _mkdirp = require('mkdirp');
const _moment = require('moment');
const _winston = require('winston'),
    _winston_daily_rotate_file = require('winston-daily-rotate-file');

const config = require(`${rootpath}` + '/config/config.js');

const cusLevels = {
    levels: {
        none:  0,
        info:  10,
        warn:  20,
        error: 30,
        debug: 40,
        verb:  50,
    },
    colors: {
        info : 'black',
        warn : 'yellow',
        error: 'red'
    }
};

_winston.addColors(cusLevels.colors);

// Create winston.logger instance for wholesale reconfigure
let logger = _winston.createLogger({
    // levels 는 config 파일 선택
    levels: cusLevels.levels,
    // Transports Log
    transports: [
        // # Setting Format Console Log
        new (_winston.transports.Console)({
            name: 'console',
            level: config.LOG_MODE,
            colorize: true,
            showLevel: true,
            json: false,
            timestamp: true,
            format: _winston.format.printf(info => formatter(info)),
            //formatter : formatter,
        })
    ]
});

function formatter(args) {
    const datetime = _moment().format('YYYY-MM-DDTHH:mm:ss.SSSZ');
    return '[' + datetime + '][' + (args.level + ' ').slice(0, 5).toLocaleUpperCase() + ']' + args.message
};

// Constructor Function
function hooks(args) {
    //console.log('hooks ::: ',args);
    //console.log('hooks instanceof ::: ', this instanceof hooks);
    if (!(this instanceof hooks)) {
        return new hooks(args);
    }

    // Find Executed Path
    // _path.sep : "/"
    // "", "Users","jinokku","Downloads","backup","api_service"
    let path = args.filename.split(_path.sep);

    // return value : -1
    let index = 0;
    let clazz = '';
    while (index < path.length) {
        if (path[index] !== ''){
            clazz += '/';
            clazz = clazz + path[index];
        }
        index++;
    }
    console.log(clazz);
    this.clazz = clazz;

    return this;
};


hooks.prototype.log = function (level, msg, callback) {
    logger.log(level, '[' + this.clazz + ']' + msg, callback);
};

hooks.prototype.info = function (msg, callback) {
    logger.info('[' + this.clazz + ']' + msg, callback);
};

hooks.prototype.error = function (msg, callback) {
    logger.error('[' + this.clazz + ']' + msg, callback);
};

module.exports = hooks;



















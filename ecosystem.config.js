const APPROOT = require('app-root-path');
const configFile = require(`${APPROOT}/config/config.json`);
const configMode = configFile.run_mode;
const config = require(`${APPROOT}/config/config.js`);
const Util = require(`${APPROOT}/util/util.js`);

/**
 * Node.js Server 설정 - start.json 구조
 *
 * @type {{apps: [{instance: number, name: string, script: string, exec_mode: string}]}}
 */
const Ecosystem = {
    apps: [
        {
            name: "search",
            script: "./app.js",
            exec_mode : "cluster",
            instance : 1
        }
    ]
};

/**
 *  config 파일의 mode가 prod일 경우에만, Logging 파일 위치를 변경
 */
if(configMode === 'prod'){
    // 1. Check Existed Logging Directory. if not existed, Create Directory
    Util.checkFolderExist(config.LOG_OUT_FILEPATH);
    // 2. Add pm2 logging Config 'out_file' set Logging out file path
    Ecosystem.app[0]['out_file'] = config.LOG_OUT_FILEPATH;
    // 3. Add pm2 logging Config 'error_file' set Logging error file path
    Ecosystem.app[0]['error_file'] = config.LOG_OUT_FILEPATH;
    // 4. Add PM2-logrotate Config log date format
    Ecosystem.app[0]['log_date_format'] = config.PM2_LOGROTATE_FORMAT;
    // 5. Set PM2 instance count
    Ecosystem.app[0]['instance'] = config.PM2_INSTANCE;
}




module.exports = Ecosystem;

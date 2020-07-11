// util.js
const APPROOT = require('app-root-path');
const path = require('path');
const filename = path.basename(__filename);
const config = require(`${APPROOT}/config/config`);
const crypto = require('crypto');
const moment = require('moment');
const logger = require('./logger')(module);

/* [SET] response sned OK */
module.exports.sendResStatusByOk = function (req, body, elaspsed) {
    elaspsed = (elaspsed != undefined) ? elaspsed : {};
    if (req === undefined) ;
    else {
        // Control
    }

    const ret = {
        "status": 200,
        "reason": "OK"
    };

    if (Array.isArray(body)) {
        const result = [];
        body.map(dataObj => {
            const data = {};
            for (let key in dataObj) data[key] = dataObj[key];
            result.push(data);
        });
        ret['result'] = result;
    } else {
        for (let key in body) ret[key] = body[key];
    }

    return ret;
};

/* [SET] response sned ERROR */
module.exports.resErr = function (req, err, msg) {
    if (req === undefined) ;
    else {
        // Control
    }
    return {"status": err, "reason": msg}
};

module.exports.errHandler = function (req, res, err) {
    res.status(500).send(this.resErr(req, 500, err.message));
}

/** [SET] param send ERROR */
module.exports.makeResParamByStatErr = function (req, statusCode, err) {
    const messageObj = [];
    if (err === undefined) ;
    else {
        err.forEach((item) => {
            messageObj.push(item.msg);
        });
    }
    우
    return {status: statusCode, message: messageObj};
};

/* [Request Parameter] Valid Check
*  @param req : Request Object
*  @param res : Response Object
*  @param fileName : Source File Name
*  @param param : Required Request Paramter Array
*  */
module.exports.validateReqParams = function (req, res, fileName, param) {
    this.reqParam(`[${req.paramStatus}]Info`, req, fileName);
    if (req.method === 'POST') req.query = req.body;

    const errStatus = {status: false, errMsg: ''};
    param.forEach((item, idx) => {
        req.checkQuery(item, `${item} required`).notEmpty();
    });

    //const err = req.validationErrors();
    req.getValidationResult().then((result) => {
        if (!result.isEmpty()) {
            let erros = result.array().map(function (element) {
                return element.msg;
            })
            logger.error(`validationErrors : ${erros}`, fileName);
            errStatus.status = true;
            errStatus.errMsg = erros;
            result.status = 400;
            return res.status(400).send(this.resErr(req, 400, erros));
        }
    });
    return errStatus;
};

/** [LOG] Request Parameter */
module.exports.reqParam = function (urlname, req, fileName) {
    logger.info('---------------------------------------', fileName);
    logger.info(`${urlname} / (method:${req.method})`, fileName);
    logger.info('---------------------------------------', fileName);
};

/**
 * gateway의 제공하는 Service별 필수 파라미터 체크.
 *
 * @param req
 * @param res
 * @returns {null}
 */
module.exports.validReq4Service = function (req, res) {
    let isChkSum = null;
    const autoParam = ['keyword','label'];
    const popParam = ['label'];
    const recomParam = ['keyword','label'];

    switch (req.query.serviceName) {
        case 'autocomplete' :
            // 자동완성
            isChkSum = this.validateReqParams(req, res, req.paramStatus, autoParam);
            break;
        case 'popquery' :
            // 인기 검색어
            isChkSum = this.validateReqParams(req, res, req.paramStatus, popParam);
            break;
        case 'recommend' :
            // 추천 검색어
            isChkSum = this.validateReqParams(req, res, req.paramStatus, recomParam);
            break;
    }
    return isChkSum;
}

module.exports.makeURL4Service = function (reqParams) {
    let resultURL = `http://${config.OPENQUERY_GATEWAY}/service/${reqParams.serviceName}`;

    switch (reqParams.serviceName) {
        case 'autocomplete' :
            // 자동완성
            resultURL += `?keyword=${reqParams.keyword}&label=${reqParams.label}`;
            break;
        case 'popquery' :
            // 인기 검색어
            resultURL += `?label=${reqParams.label}`;
            break;
        case 'recommend' :
            // 추천 검색어
            resultURL += `?keyword=${reqParams.keyword}&label=${reqParams.label}`;
            break;
    }
    return resultURL;
}

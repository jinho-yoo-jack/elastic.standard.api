// util.js
const APPROOT = require('app-root-path');
const path = require('path');
const filename = path.basename(__filename);
const config = require(`${APPROOT}/config/config`);
const configfile = require(`${APPROOT}/config/config.json`);
const crypto = require('crypto');
const runmode = configfile.runmode;
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

    for (let key in body) ret[key] = body[key];
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
    }우
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
            return res.status(400).send(this.res_err(req, 400, erros));
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

module.exports.setQueryValue = function (setQueryPostion, keyArray, fieldValue) {
    let   depth = 0;
    const key = keyArray;
    const keyLength = key.length - 1;
    let   dstObj = null;

    const checkQueryKey = function (element) {
        // Queyr의 구조가 모두 객체인 경우에만 정상 실행.
        if (element.hasOwnProperty(key[depth])) {
            // key값을 확인한 후에, 해당하는 element의 typeof check가 필요.
            if (depth == keyLength) {
                // 마지막 depth인지 확인 후, 찾은 필드에 값 할당
                dstObj[key[depth]] = fieldValue;
            }
            if (depth < keyLength) {
                // n번째 depth객체를 dstObj 담고
                dstObj = element[key[depth]];
                // depth count up
                depth++;
                // 재귀호출을 이용해서 n+1번째 depth객체의 key값을 확인한다.
                checkQueryKey(dstObj);
            }
        }
        else {
            // 첫번째 depth는 중복되어 n번째 depth까지 내려가서 확인 했는데,
            // 최종 depth 멤버의 key가 동일하지 않는 경우가 존재.
            // Key 값이 일치 하지 않는 경우, depth 초기화
            depth = 0;
        }
    };

    setQueryPostion.forEach((obj, idx) => {
        checkQueryKey(obj);
    });

}


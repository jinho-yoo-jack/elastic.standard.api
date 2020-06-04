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
    let depth = 0;  // Object 형태로 되어 있는 Query의 depth을 표현
    const queryKey = keyArray; // Query Fields 순서
    const depthLength = queryKey.length - 1;

    const checkQueryKey = (queryObj) => {
        Object.keys(queryObj).map(key => {
            // 1. queryObj의 key(Member 이름) 값과 keyArray의 depth번째 필드명과 비교
            if (key == queryKey[depth]) {
                // 2. 최종 depth번째인가?
                if (depth == depthLength) {
                    queryObj[key] = fieldValue;
                    // 2-1. 최종 depth번째의 필드에 값을 할당하고 종료.
                    return true;
                }
                // 3. 현재 queryObj의 Type이 Array 일 경우,
                // - must OR shuold절 내부에 중첩되는 must 또는 should절 case check
                if (Array.isArray(queryObj[key])) {
                    // 3-1. depth 증가 후,
                    depth++;
                    // 3-2. Array 안에 있는 Query key값 확인.
                    queryObj[key].forEach(obj => {
                        checkQueryKey(obj);
                    });
                } else {
                    // 4. 그렇지 않고 Object type일 경우, depth 증가 후, 재귀함수 호출
                    depth++;
                    checkQueryKey(queryObj[key])
                }
            } else {
                depth = 0;
            }
        });
    }

    setQueryPostion.forEach((obj, idx) => {
        checkQueryKey(obj);

    });

}


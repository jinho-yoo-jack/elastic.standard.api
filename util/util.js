// util.js
const APPROOT = require('app-root-path');
const fs = require('fs');

const config = require(`${APPROOT}/config/config`);
const logger = require('./logger')(module);

/* [SET] response sned OK */
module.exports.sendResStatusByOk = (req, body) => {
  if (req === undefined) {
    ;
  } else {
    // Control
  }

  const ret = {
    'status': 200,
    'reason': 'OK'
  };

  if (Array.isArray(body)) {
    const result = [];
    body.map((dataObj) => {
      const data = {};
      Object.keys(dataObj)
        .map((key) => {
          if (Object.prototype.hasOwnProperty.call(dataObj, key)) {
            data[key] = dataObj[key];
          }
        });
      result.push(data);
    });
    ret.result = result;
  } else {
    Object.keys(body)
      .map((key) => {
        if (Object.prototype.hasOwnProperty.call(body, key)) {
          ret[key] = body[key];
        }
      });
  }

  return ret;
};

/**
 *
 * @param req
 * @param err
 * @param msg
 * @returns {{reason: *, status: *}}
 */
module.exports.setErrResMsg = (req, err, msg) => {
  if (req === undefined) {
    ;
  } else {
    // Control
  }
  return {
    'status': err,
    'reason': msg
  };
};

module.exports.errHandler = (req, res, err) => {
  res.status(500)
    .send(this.setErrResMsg(req, 500, err.message));
};

/** [SET] param send ERROR */
module.exports.makeResParamByStatErr = (req, statusCode, err) => {
  const messageObj = [];
  if (err === undefined) {
    ;
  } else {
    err.forEach((item) => {
      messageObj.push(item.msg);
    });
  }
  return {
    status: statusCode,
    message: messageObj
  };
};

/**
 * [Request Parameter] Check Validation
 *
 * @param req : Request Object
 * @param res : Response Object
 * @param fileName : Source File Name
 * @param param : Required Request Paramter Array
 * @returns {{errMsg: string, status: boolean}}
 */
module.exports.validateReqParams = async (req, res, fileName, param) => {
  this.reqParam(`[${req.paramStatus}]Info`, req, fileName);
  if (req.method === 'POST') req.query = req.body;

  const errStatus = {
    status: false,
    errMsg: ''
  };
  param.forEach((item) => {
    // CheckQuery() 결과를 req.getValidationResult()를 통해서 가져 올 수 있다.
    req.checkQuery(item, `${item} required`)
      .notEmpty();
  });

  // const err = req.validationErrors();
  const result = await req.getValidationResult();
  if (!result.isEmpty()) {
    const erros = result.array()
      .map((element) => {
        return element.msg;
      });
    logger.error(`validationErrors : ${erros}`, fileName);
    errStatus.status = true;
    errStatus.errStatus = 500;
    errStatus.errMsg = erros;
  }

  return errStatus;
};

/** [LOG] Request Parameter */
module.exports.reqParam = function (urlname, req, fileName) {
  logger.info('---------------------------------------', fileName);
  logger.info(`${urlname} / (method:${req.method})`, fileName);
  logger.info('---------------------------------------', fileName);
};

/**
 * gateway의 제공하는 Service['autocomplete','recommend','popuqery']별 필수 파라미터 체크.
 *
 * @param req
 * @param res
 * @returns {null}
 */
module.exports.validReq4Service = function (req, res) {
  let isChkSum = null;
  const autoParam = ['keyword', 'label'];
  const popParam = ['label'];
  const recomParam = ['keyword', 'label'];

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
    default :

      break;
  }
  return isChkSum;
};

/**
 * gateway의 Service별 URL 생성
 *
 * @param reqParams
 * @returns {string}
 */
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
    default :
  }
  return resultURL;
};

/**
 * PM2가 저장하는 Log Directory 존재 여부 확인 및 생성
 *
 * @param path {String} PM2 설정에서 로그파일 위치
 */
module.exports.checkFolderExist = function (path) {
  fs.readdir(path, (error) => {
    if (error) {
      logger.info('##### Logging Directory not existed!!! ####');
      logger.info('##### Start Make directory /log/solution/... ####');
      fs.mkdirSync(path);
    }
  });

};

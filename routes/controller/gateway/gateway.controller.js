/* Search API */
// node.js Module
const APPROOT = require('app-root-path');
const path = require('path');

const fileName = path.basename(__filename);
// Util
const Util = require(`${APPROOT}/util/util`);
const logger = require(`${APPROOT}/util/logger`)(module);
// Service
const Gateway = require(`${APPROOT}/routes/service/gateway.service.js`);

module.exports = {
  async service(req, res) {
    try {
      // Set Interface Name
      req.paramStatus = 'gateway_service';
      // 1. Check serviceName Validate
      const validateResult = await Util.validateReqParams(req, res, req.paramStatus,
        ['serviceName', 'keyword', 'label']);
      if (validateResult.status) {
        return res.status(400)
          .send(Util.setErrResMsg(req,validateResult.errStatus,validateResult.errMsg[0]));
      }
      // 1-1. Check Request Params Validate By serviceName
      const isValid4Service = Util.validReq4Service(req, res);
      if (isValid4Service.status) {
        return res.status(400)
          .send(validateResult.errMsg);
      }

      // 2. GET or POST 모든 Request Paramter는 req.query에 담겨져 있다.

      // 3. Call OpenQuery Gateway API
      const searchResult = await Gateway.getServiceResult(req.query);

      // 5. Send Result
      return res.json(Util.sendResStatusByOk(req, searchResult));

    } catch (err) {
      // 4-1. If an error occurs, Send Error Info.
      logger.error('---------------------------------------', fileName);
      logger.error(`${req.originalUrl} / (method:${req.method})`, fileName);
      logger.error(err);
      logger.error('---------------------------------------', fileName);
      return res.json(Util.errHandler(req, res, err));
    }
  }
};


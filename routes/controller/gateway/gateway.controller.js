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
// Response
const ResponseModel = require(`${APPROOT}/routes/models/response/index`);


// Define Global Variable
const search_type = 'dfs_query_then_fetch';

module.exports = {
    service: async function (req, res) {
        try {
            // Set Interface Name
            req.paramStatus = 'gateway_service';
            // 1. Request Parameter Validation Check.
            const validateResult = Util.validateReqParams(req, res, req.paramStatus, ['serviceName']);
            if (validateResult.status) return res.status(400).send(paramErr.errMsg);

            const isValid4Service = Util.validReq4Service(req,res);
            if (isValid4Service.status) return res.status(400).send(paramErr.errMsg);

            // 2. GET or POST 모든 Request Paramter는 req.query에 담겨져 있다.

            // 3. After Request Elasticsearch Query, Response Result about Query.
            const searchResult = await Gateway.getServiceResult(req.query);

            // 4. Call ResponseModel(EsService.Search.Response)
            // 5. Send Result about Query(payload).
            res.json(Util.sendResStatusByOk(req, searchResult));

        } catch (err) {
            // 4-1. If an error occurs, Send Error Info.
            logger.error('---------------------------------------', fileName);
            logger.error(`${req.originalUrl} / (method:${req.method})`, fileName);
            logger.error(err);
            logger.error('---------------------------------------', fileName);
            res.json(Util.errHandler(req, res, err));
        }
    },
    popquery : async (req, res) => {

    }
};


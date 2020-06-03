/* Search API */
// node.js Module
const APPROOT = require('app-root-path');
const path = require('path');
const fileName = path.basename(__filename);

// Util
const Util = require(`${APPROOT}/util/util`);
const logger = require(`${APPROOT}/util/logger`)(module);
// Service
const Search = require(`${APPROOT}/routes/service/search.service.js`);
// Response
const ResponseModel = require(`${APPROOT}/routes/models/response/index`);


// Define Global Variable
const search_type = 'dfs_query_then_fetch';

module.exports = {
    getUserGrdInfo: async function (req, res) {
        try {
            req.paramStatus = 'Api aiUser_range_10';
            // 1. Request Parameter Validation Check.
            const validateResult = Util.validateReqParams(req, res, fileName, ['user_id']);
            if (validateResult.status) return res.status(400).send(paramErr.errMsg);

            // 2. GET or POST 모든 Request Paramter는 req.query에 담겨져 있다.
            const setReqParams = {
                size: req.query.size || 10,
                user_id: req.query.user_id || '',
                cate1: req.query.cate_cd_1 || '',
                cate2: req.query.cate_cd_2 || '',
                cate3: req.query.cate_cd_3 || '',
                cate4: req.query.cate_cd_4 || '',
                cate5: req.query.cate_cd_5 || '',
                level_limit: req.query.level_limit || 3,
                date_range: req.query.date_range || 0,
                dayOfWeek: req.query.dayOfWeek || 0,
                dayOfMonth: req.query.dayOfMonth || 0,
            };

            // 3. After Request Elasticsearch Query, Response Result about Query.
            const searchResult = await Search.searchUserGrdInfo(setReqParams);

            // 4. Call ResponseModel(EsService.Search.Response)
            // 5. Send Result about Query(payload).
            ResponseModel.getUserGrdInfo(setReqParams, searchResult, res);

        } catch (err) {
            // 4-1. If an error occurs, Send Error Info.
            //logger.error('---------------------------------------', fileName);
            //logger.error(`${urlname} / (method:${req.method})`, fileName);
            logger.error(err);
            //logger.error('---------------------------------------', fileName);
            res.json(Util.errHandler(req, res, err));
        }
    }
};


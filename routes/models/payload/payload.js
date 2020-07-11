const APPROOT = require('app-root-path');
const moment = require('moment');
require('moment-timezone');
moment.tz.setDefault('Asia/Seoul');

const Util = require(`${APPROOT}/util/util`);

// convert "match" query
// convert "range" query

// Edit Elasticsearch Query
const setReqParams4UsrGradeBy10 = (req) => {
    // 0. Settings Request Paramter
    const reqParams = {
        size: req.size,
        user_id: req.user_id || '',
        cate1: req.cate_cd_1 || '',
        cate2: req.cate_cd_2 || '',
        cate3: req.cate_cd_3 || '',
        cate4: req.cate_cd_4 || '',
        cate5: req.cate_cd_5 || '',
        level_limit: req.level_limit || 3,
        date_range: req.date_range || 0,
        dayOfWeek: req.dayOfWeek || 0,
        dayOfMonth: req.dayOfMonth || 0,
    }

    if (reqParams.date_range > 0) {
        reqParams.size = reqParams.date_range;
    }

    // ${date_range} 값 만큼 조회날짜 생성
    if (reqParams.date_range == 0) {

        // EX) Today: 2020.05.01 --> gte : 2020.04.30
        reqParams.gte = "now-1d/d"
    } else {
        // ${date_range} 값이 존재하는 경우 그만큼 범위 설정
        // indexName = indexName + "*";
        reqParams.gte = "now-" + (Number(reqParams.date_range) + 1) + "d/d";
    }

    if (reqParams.dayOfWeek > 0) {
        reqParams.dayOfWeekFilter = "doc['base_date'].date.dayOfWeek == " + reqParams.dayOfWeek;
    } else if (reqParams.dayOfMonth > 0) {
        reqParams.dayOfWeekFilter = "doc['base_date'].date.dayOfMonth == 1";
    }

    return reqParams;
};


const setReqParams4Gateway = (req) => {
    const result = {};
    const serviceName = req.serviceName.toLowerCase();
    result['serviceName'] = serviceName;
    switch (serviceName) {
        case 'autocomplete' || 'recommend' :
            // 자동완성
            result['keyword'] = req.keyword;
            result['label'] = req.label;
            break;
        case 'popquery' :
            // 인기 검색어
            result['label'] = req.label;
            break;
    }

    return result;
}

module.exports = {
    setReqParams4UsrGradeBy10: setReqParams4UsrGradeBy10,
    setReqParams4Gateway: setReqParams4Gateway
}


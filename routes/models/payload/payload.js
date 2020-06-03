const APPROOT = require('app-root-path');
const Util = require(`${APPROOT}/util/util`);
const PayloadModel = require('./payload.model');
const moment = require('moment');
require('moment-timezone');
moment.tz.setDefault('Asia/Seoul');

// convert "match" query
// convert "range" query

// Edit Elasticsearch Query
const searchUserGrdInfoQry = (req) => {
    console.log('[REQUEST] %j',req);
    // 0. Settings Request Paramter
    let size = req.size;
    let user_id = req.user_id || '';
    let cate1 = req.cate_cd_1 || '';
    let cate2 = req.cate_cd_2 || '';
    let cate3 = req.cate_cd_3 || '';
    let cate4 = req.cate_cd_4 || '';
    let cate5 = req.cate_cd_5 || '';
    let level_limit = req.level_limit || 3;
    let date_range = req.date_range || 0;
    let dayOfWeek = req.dayOfWeek || 0;
    let dayOfMonth = req.dayOfMonth || 0;

    // 1. Load payload
    const payload = PayloadModel.getUserGrdInfoPayload();
    // 2. Settings Query Value
    if (user_id !== '') {
        Util.setQueryValue(payload.query.bool.must,["match", "user_id"], user_id);
    }

    if (date_range > 0){
        size = date_range;
        payload.size = size;
    }

    let gte = "";
    // ${date_range} 값 만큼 조회날짜 생성
    if (date_range == 0) {
        // # Modify #
        // date_range 입력값이 있을 경우에
        // 검색 대상 인덱스를 ai-user-grade(ALIAS)가 아닌
        // 전체 ai-user-grade*로 변경.
        indexName = indexName + "*";
        // EX) Today: 2020.05.01 --> gte : 2020.04.30
        gte = "now-1d/d"
    } else {
        // ${date_range} 값이 존재하는 경우 그만큼 범위 설정
        // indexName = indexName + "*";
        gte = "now-" + (Number(date_range) + 1) + "d/d";
    }
    Util.setQueryValue(payload.query.bool.must,["range", "base_date","gte"], gte);
    //payload.query.bool.must[0].range.base_date.gte = gte;

    let dayOfWeekFilter = null;
    if (dayOfWeek > 0) {
        dayOfWeekFilter = {
            "script": {
                "script": "doc['base_date'].date.dayOfWeek == " + dayOfWeek
            }
        };
    } else if (dayOfMonth > 0) {
        dayOfWeekFilter = {
            "script": {
                "script": "doc['base_date'].date.dayOfMonth == 1"
            }
        };
    }
    if (dayOfWeekFilter != null) payload.query.bool["filter"] = dayOfWeekFilter;


    return payload;
};


module.exports = {
    searchUserGrdInfoQry: searchUserGrdInfoQry
}


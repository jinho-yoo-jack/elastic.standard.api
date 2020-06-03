// Express
const app = require('express')();

// Import Module for Node.js
const APPROOT = require('app-root-path');
const validator = require('express-validator');
const moment = require('moment');
const md5 = require('md5');
const bodyParser = require('body-parser');
const fs = require('fs');
const http = require('http');
const request = require('request');
const jsonQuery = require('json-query');
const cleanDeep = require('clean-deep');

// Import User Define Function Module for Response
const res_ok = require(APPROOT + '/lib/res_ok');
const res_err = require(APPROOT + '/lib/res_err');
// Elasticsearch
const elasticsearch = require(APPROOT + '/models/elasticsearch');
// Config
const config = require(APPROOT + '/config/config');

// Define Global Variable
const search_type = 'dfs_query_then_fetch';

// Middleware
app.use(validator());
app.use(bodyParser.urlencoded({extended: false}));

app.all('/', (req, res) => {
    console.log('start');
    res.status(403).send();
});

/* IF-EBS-001 사용자 정보 호출 */
app.all('/aiUser_range_10', (req, res, next) => {
    // List of Variable
    let s_body = {};

    // Request Parameters By POST || GET || Default Value
    let size = req.body.size || req.query.size || 10;
    let user_id = req.body.user_id || req.query.user_id || '';
    let cate1 = req.body.cate_cd_1 || req.query.cate_cd_1 || '';
    let cate2 = req.body.cate_cd_2 || req.query.cate_cd_2 || '';
    let cate3 = req.body.cate_cd_3 || req.query.cate_cd_3 || '';
    let cate4 = req.body.cate_cd_4 || req.query.cate_cd_4 || '';
    let cate5 = req.body.cate_cd_5 || req.query.cate_cd_5 || '';
    let level_limit = req.body.level_limit || req.query.level_limit || 3;
    let date_range = req.body.date_range || req.query.date_range || 0;
    let dayOfWeek = req.body.dayOfWeek || req.query.dayOfWeek || 0;
    let dayOfMonth = req.body.dayOfMonth || req.query.dayOfMonth || 0;

    if (date_range > 0) size = date_range;

    const date_operator = "";

    // let source_index = "v1-solution*";
    let source_index = "ai-user-10grade";

    // Check UserID
    req
        .checkQuery('user_id', 'User id is required')
        .notEmpty();

    // elapsed time
    const elapsed = {};
    let start, end;

    // Result
    const body = {};

    // [Process#1] -- Search By Input Value
    const workflow1 = function () {
        //elapsed time
        start = new Date();

        let aggs = {};
        let requery = {
            "bool": {
                "must": []
            }
        };

        // UserID 입력 값이 있을 때 match Query 생성
        if (user_id != '') {
            let query_match = {
                "match": {
                    "user_id": user_id
                }
            };
            requery.bool.must.push(query_match);
        }

        // 기준(or 오늘) 날짜 설정
        let date = new Date();
        let year = date.getFullYear();
        let month = date.getMonth() + 1;
        let day = date.getDate();

        if (month < 10) month = "0" + month;
        if (day < 10) day = "0" + day;
        let cur_date = year + date_operator
            + month + date_operator + day;

        let gte = "";
        // ${date_range} 값 만큼 조회날짜 생성
        if (date_range == 0) {
            // # Modify #
            // date_range 입력값이 있을 경우에
            // 검색 대상 인덱스를 ai-user-grade(ALIAS)가 아닌
            // 전체 ai-user-grade*로 변경.
            source_index = source_index + "*";
            // EX) Today: 2020.05.01 --> gte : 2020.04.30
            gte = "now-1d/d"
        } else {
            //${date_range} 값이 존재하는 경우 그만큼 범
            source_index = source_index + "*";
            gte = "now-" + (Number(date_range) + 1) + "d/d";
        }

        let date_range_query = {
            "range": {
                "base_date": {
                    "gte": gte,
                    "lte": "now-1d/d",
                    "time_zone": "Asia/Seoul"
                }
            }
        };
        requery.bool.must.push(date_range_query);

        if (dayOfWeek > 0) {
            let dayofweek_filter = {
                "script": {
                    "script": "doc['base_date'].date.dayOfWeek == " + dayOfWeek
                }
            };
            requery.bool["filter"] = dayofweek_filter;
        } else if (dayOfMonth > 0) {
            let dayofmonth_filter = {
                "script": {
                    "script": "doc['base_date'].date.dayOfMonth == 1"
                }
            };
            requery.bool["filter"] = dayofmonth_filter;
        }

        let sort = [
            {
                "_index": {
                    "order": "desc"
                }
            }
        ];

        s_body = {
            "size": size,
            "query": requery,
            "sort": sort
        };

        console.log("[IF-EBS-01@%j] Body ::: %j", source_index, s_body);

        //ES Search Query
        return elasticsearch.client1.search({
            index: source_index,
            searchType: search_type,
            body: s_body
        });

    };
    // [Process#2]
    //  If Process#1 == Success,  -- Call Response Function
    let sendresult = function (resp) {

        // elapsed time
        resp = resp[0];
        // let category = [];
        let results = [];

        let hits = resp.hits.hits;

        for (let cnt in hits) {
            let obj = {};
            let category = {};
            let result_arr = hits[cnt];

            if ((cate1 + cate2 + cate3 + cate4 + cate5) != "") {
                let cate_cd = '';
                if (cate5.length > 0) cate_cd = cate5;
                else if (cate4.length > 0) cate_cd = cate4;
                else if (cate3.length > 0) cate_cd = cate3;
                else if (cate2.length > 0) cate_cd = cate2;
                else if (cate1.length > 0) cate_cd = cate1;

                category = find_in_arr(result_arr._source.Level_1, cate_cd, level_limit);

            } else {

                let base_arr = result_arr._source.Level_1;

                if (level_limit == 5) {
                    category["Level_1"] = base_arr;
                } else if (level_limit == 4) {
                    for (let cnt1 in base_arr) {
                        for (let cnt2 in base_arr[cnt1].Level_2) {
                            for (let cnt3 in base_arr[cnt1].Level_2[cnt2].Level_3) {
                                for (let cnt4 in base_arr[cnt1].Level_2[cnt2].Level_3[cnt4]) {
                                    delete base_arr[cnt1].Level_2[cnt2].Level_3[cnt3].Level_4[cnt4].Level_5;
                                }
                            }
                        }
                    }
                    category["Level_1"] = base_arr;
                } else if (level_limit == 3) {
                    for (let cnt1 in base_arr) {
                        for (let cnt2 in base_arr[cnt1].Level_2) {
                            for (let cnt3 in base_arr[cnt1].Level_2[cnt2].Level_3) {
                                delete base_arr[cnt1].Level_2[cnt2].Level_3[cnt3].Level_4;
                            }
                        }
                    }
                    category["Level_1"] = base_arr;
                } else if (level_limit == 2) {
                    for (let cnt1 in base_arr) {
                        for (let cnt2 in base_arr[cnt1].Level_2) {
                            delete base_arr[cnt1].Level_2[cnt2].Level_3;
                        }
                    }
                    category["Level_1"] = base_arr;
                } else if (level_limit == 1) {
                    for (let cnt1 in base_arr) {
                        delete base_arr[cnt1].Level_2;
                    }
                    category["Level_1"] = base_arr;
                }
            }

            //obj.base_date = result_arr._source.base_date;
            if (result_arr._index.length == 26) obj.base_date = result_arr._index.substring(16, 20) + "-" + result_arr._index.substring(21, 23) + "-" + result_arr._index.substring(24);
            else obj.base_date = null;
            let top_depth = Object.keys(category);
            obj[top_depth] = category[top_depth];

            results.push(obj);
        }

        body.users = results;
        res.send(res_ok(req, body, elapsed));
    };
    //  If Process#2 == Failure,  -- Error Handler : send error
    const errhandler = function (err) {
        res.status(500).send(res_err(req, 500, err.message));
    };

    const isEmpty = function (value) {
        if (value == "" || value == null || value == undefined ||
            (value != null && typeof value == "object" && !Object.keys(value).length)) {
            return true;
        } else {
            return false;
        }
    };

    // -- Run workflow
    Promise
        .all([workflow1()])
        .then(sendresult)
        .catch(errhandler);
});

/* IF-EBS-003 인공지능 문제풀이 문항 추천 */
app.all('/aiRcmnd', (req, res) => {
    let user_id = req.body.user_id || req.query.user_id || '';
    let user_level = req.body.user_level || req.query.user_level || 6;
    let cate1;
    let cate2 = req.body.cate_cd_2 || req.query.cate_cd_2 || '';
    let cate3 = req.body.cate_cd_3 || req.query.cate_cd_3 || '';
    let cate4 = req.body.cate_cd_4 || req.query.cate_cd_4 || '';
    let cate5 = req.body.cate_cd_6 || req.query.cate_cd_5 || '';
    let item_num = req.body.item_num || req.query.item_num || 3;
    let level = req.body.level || req.query.level || 0;           // 0_자동추천 1_난이도증가 -1_난이도감소
    let is_moc = req.body.is_moc || req.query.is_moc || 0;         // 0_전체 1_교재 2_기출
    let last_item_level = req.body.last_item_level || req.query.last_item_level || 0; // 이전문항 난이도
    let last_item_id = req.body.last_item_id || req.query.last_item_id || '';      // 이전문항 문항코드
    let is_correct = req.body.is_correct || req.query.is_correct || 1;           // 0_오답 1_정답
    let random = req.body.random || req.query.random || 0;                   // 0_기 1_난이도 Random 추천
    let level_min = req.body.level_min || req.query.level_min || 0;             // 난이도 최소 값
    let level_max = req.body.level_max || req.query.level_max || 0;             // 난이도 최고 값
    let del_dupitem_yn = req.body.del_dupitem_yn || req.query.del_dupitem_yn || 1;   // 이전 풀이 문항 제외 여부 0_전체 추천 1_이전풀이문항 제외

    let status = 200;

    // Validator
    if (cate2 == '' && cate3 == '' && cate4 == '' && cate5 == '') {
        res.status(400).send(res_err(req, 400, 'cate_cd required'));
    }

    let s_body = {};
    let source_index_wf1 = "actionlog-*";
    let source_index_wf2 = "ai-solution-log-*";
    let source_index_wf3 = "v1-item";
    let lvl = '';

    const item_type = 21;
    const base_lvl = 0.5;
    const lv_weight_wf2 = 0.1;
    const correct_weight = 0.05;

    // @문항추천 분류가 전체(0)가 아닌 경우, workflow1에서 조회하는 Index 변경
    if (is_moc == 1) {
        // 문항추천 "교재(1)"
        source_index_wf1 = "v1-solution-20*"
    } else if (is_moc == 2) {
        // 문항추천 "기출(2)"
        source_index_wf1 = "v1-solution-moc-*"
    }

    // Elasticsearch
    let elapsed = {};
    let start, end;

    // Result
    let body = {};
    let wf2_res = [];
    let wf3_res = [];

    let cate2_arr = [];
    if (cate2.indexOf(',') != -1) {
        cate2_arr = cate2.split(',');
    } else {
        cate2_arr.push(cate2);
    }

    let cate3_arr = [];
    if (cate3.indexOf(',') != -1) {
        cate3_arr = cate3.split(',');
    } else {
        cate3_arr.push(cate3);
    }

    let cate4_arr = [];
    if (cate4.indexOf(',') != -1) {
        cate4_arr = cate4.split(',');
    } else {
        cate4_arr.push(cate4);
    }

    let cate5_arr = [];
    if (cate5.indexOf(',') != -1) {
        cate5_arr = cate5.split(',');
    } else {
        cate5_arr.push(cate5);
    }

    // workflow1 사용자 등급 조회
    let workflow1 = function (req, res) {
        return new Promise(function (resolve, reject) {
            let requery = {
                "bool": {
                    "must": []
                }
            };

            // 영역 값(cateN or cateN_arr) 입력이 있을 때 match Query 생성
            if (cate5 !== '' && cate5_arr.length == 1) {
                let cate5_match = {"match": {"date.cate_cd_5": cate5}};
                requery.bool.must.push(cate5_match);
            } else if (cate4 !== '' && cate4_arr.length == 1) {
                let cate4_match = {"match": {"date.cate_cd_4": cate4}};
                requery.bool.must.push(cate4_match);
            } else if (cate3 !== '' && cate3_arr.length == 1) {
                let cate3_match = {"match": {"date.cate_cd_3": cate3}};
                requery.bool.must.push(cate3_match);
            } else if (cate2 !== '' && cate2_arr.length == 1) {
                let cate2_match = {"match": {"date.cate_cd_2": cate2}};
                requery.bool.must.push(cate2_match);
            }

            let exists_query = {"exists": {"field": "data.lvl"}};
            requery.bool.must.push(exists_query);

            // 사용자ID가 null이 아닐 때
            if (user_id != '') {
                let user_match = {"match": {"data.user_id": user_id}};
                requery.bool.must.push(user_match);
            }

            // is_correct가 0 이 아닐 때 lvl 값을 average aggreagtion
            let aggs = {
                "lvl_avg": {
                    "avg": {
                        "field": "data.lvl",
                        "script": {"source": "if (doc['data.is_correct.keyword'].value != '0') { doc['data.lvl'].value } else (doc['data.lvl'].value)*2"}
                    }
                }
            };

            // workflow1 최종 Query
            s_body = {
                "size": 0,
                "query": requery,
                "aggs": aggs
            };
            // ES 검색 쿼리 실행
            elasticsearch.client1.search({
                index: source_index_wf2,
                searchType: search_type,
                body: s_body
            }).then(function (resp) {
                let hits = resp.aggregations;

                // lvl_avg.value가 값이 NULL이 아닌 경우에만 user_level 새롭게 저장
                // 그렇지 않다면 request.Parameter의 user_level를 사용한다.
                if (hits.lvl_avg.value != null) user_level = hits.lvl_avg.value * 10;

                console.log("= 사용자 등급 조회=============================================");
                console.log(" Index %j", source_index_wf2);
                console.log(" Query %j", s_body);
                console.log(" Result lvl_avg %j", hits.lvl_avg.value);
                console.log(" Result user_level %j", user_level);
                console.log(" Result cate2_arr %j", cate2_arr.length);
                console.log("==============================================");
                return resolve();

            });
        });
    };
    // workflow2 사용자 과거 문제풀이 이력 조회
    let workflow2 = function (req, res) {
        return new Promise(function (resolve, reject) {
            if (user_id != '') {
                let requery = {
                    "bool": {
                        "must": []
                    }
                };

                // 과거 문제풀이 이력의 cate_cd_N의 Item-id
                let shouldCateQuery = {
                    "bool": {
                        "should": []
                    }
                };

                let user_match = {"match": {"data.user_id.keyword": user_id}}
                requery.bool.must.push(user_match);

                if (cate5 != '') {
                    for (let cate5_cnt in cate5_arr) {
                        let match = {"match": {"data.cate_cd_5": cate5_arr[cate5_cnt]}};
                        shouldCateQuery.bool.should.push(match);
                    }
                    requery.bool.must.push(shouldCateQuery);
                } else if (cate4 != '') {
                    for (let cate4_cnt in cate4_arr) {
                        let match = {"match": {"data.cate_cd_4": cate4_arr[cate4_cnt]}};
                        shouldCateQuery.bool.should.push(match);
                    }
                    requery.bool.must.push(shouldCateQuery);
                } else if (cate3 != '') {
                    for (let cate3_cnt in cate3_arr) {
                        let match = {"match": {"data.cate_cd_3": cate3_arr[cate3_cnt]}};
                        shouldCateQuery.bool.should.push(match);
                    }
                    requery.bool.must.push(shouldCateQuery);
                } else if (cate2 != '') {
                    for (let cate2_cnt in cate2_arr) {
                        let match = {"match": {"data.cate_cd_2": cate2_arr[cate2_cnt]}};
                        shouldCateQuery.bool.should.push(match);
                    }
                    requery.bool.must.push(shouldCateQuery);
                }

                // 최종 쿼리
                s_body = {
                    "size": 10000,
                    "query": requery
                };
                // console.log("[aiRcmnd] wf2 s_body [ %j ] -- %j", source_index_wf2, s_body);

                // ES 검색 쿼리 실행
                elasticsearch.client1.search({
                    index: source_index_wf2,
                    searchType: search_type,
                    body: s_body
                }).then(function (resp) {
                    let hits = resp.hits.hits;

                    if (isNaN(last_item_id) == false && last_item_id != null && last_item_id.trim() != "") wf2_res.push(last_item_id);  //이전풀이 문항코드

                    for (let hit_i in hits) {
                        let hit = hits[hit_i];
                        let item_id = hit._source.data[0].item_id;
                        if (item_id.trim() !== "" && item_id !== null) {
                            if (wf2_res.indexOf(item_id) == -1) wf2_res.push(item_id);
                        }
                    }
                    console.log("= 이전풀이문항 조회 =============================================");
                    console.log("Index ::: %j", source_index_wf2);
                    console.log("Must Not List Query ::: %j", s_body);
                    console.log("Search Result ::: %j", wf2_res);
                    console.log("==============================================");
                    return resolve();
                });
            } else {
                return resolve
            }
        });
    };
    // workflow3 문제은행(v1-item)에서 과거 문제풀이ID(item_id)를 제외한 문제 조회 후 추천
    let workflow3 = function (req, res) {
        return new Promise(function (resolve, reject) {
            let requery = {
                "function_score": {
                    "query": {
                        "bool": {
                            "must": [],
                            "must_not": []
                        }
                    },
                    "random_score": {}
                }
            };

            let reverse_query = {
                "function_score": {
                    "query": {
                        "bool": {
                            "must": [],
                            "must_not": []
                        }
                    },
                    "random_score": {}
                }
            };

            // 과거 문제풀이 이력이 존재하고, 문제추천 시, 과거 문제풀이 이력 제외를 원하는 경우,
            if (wf2_res.length > 0 && del_dupitem_yn > 0) {
                let must_not_match = {"terms": {"item_id": wf2_res}};
                requery.function_score.query.bool.must_not.push(must_not_match);
                reverse_query.function_score.query.bool.must_not.push(must_not_match);
                console.log(user_id + " [Must Not] Query %j", must_not_match);
            }

            // #사용하지 않는 코드
            let range_lvl = Number(lvl) - (level * lv_weight_wf2);


            let item_type_match = {"match": {"type": item_type}};
            requery.function_score.query.bool.must.push(item_type_match);

            let shouldCateQuery = {
                "bool": {
                    "should": []
                }
            };
            // 문제 추천을 원하는 교과 분류별 cate_cd_N의 match 쿼리
            // EX) should : [{"match" : "cate_cd_1" : "VALUE"} ... ]
            if (cate5 != '' && cate5 != undefined) {
                for (let cate5_cnt in cate5_arr) {
                    let match = {"match": {"cate_cd_5": cate5_arr[cate5_cnt]}};
                    shouldCateQuery.bool.should.push(match);
                }
                requery.function_score.query.bool.must.push(shouldCateQuery);
                reverse_query.function_score.query.bool.must.push(shouldCateQuery);
            } else if (cate4 != '' && cate4 != undefined) {
                for (let cate4_cnt in cate4_arr) {
                    let match = {"match": {"cate_cd_4": cate4_arr[cate4_cnt]}};
                    shouldCateQuery.bool.should.push(match);
                }
                requery.function_score.query.bool.must.push(shouldCateQuery);
                reverse_query.function_score.query.bool.must.push(shouldCateQuery);
            } else if (cate3 != '' && cate3 != undefined) {
                for (let cate3_cnt in cate3_arr) {
                    let match = {"match": {"cate_cd_3": cate3_arr[cate3_cnt]}};
                    shouldCateQuery.bool.should.push(match);
                }
                requery.function_score.query.bool.must.push(shouldCateQuery);
                reverse_query.function_score.query.bool.must.push(shouldCateQuery);
            } else if (cate2 != '' && cate2 != undefined) {
                for (let cate2_cnt in cate2_arr) {
                    let match = {"match": {"cate_cd_2": cate2_arr[cate2_cnt]}};
                    shouldCateQuery.bool.should.push(match);
                }
                requery.function_score.query.bool.must.push(shouldCateQuery);
                reverse_query.function_score.query.bool.must.push(shouldCateQuery);
            } else if (cate1 != '' && cate1 != undefined) {
                for (let cate1_cnt in cate1_arr) {
                    let match = {"match": {"cate_cd_1": cate1_arr[cate1_cnt]}};
                    shouldCateQuery.bool.should.push(match);
                }
                requery.function_score.query.bool.must.push(shouldCateQuery);
                reverse_query.function_score.query.bool.must.push(shouldCateQuery);
            }

            // 문제 Level 범위 설정
            let range = {
                "range": {
                    "lvl": {}
                }
            };

            let reverse_range = {
                "range": {
                    "lvl": {}
                }
            };
            // 사용자 등급(1-10등급) * 10
            let min_range = Number(user_level) * 10;
            let max_range = Number(user_level) * 10;

            let sort;
            let reverse_sort;

            if (level_min > 0 && level_max > 0) {  // 추천 난이도 범위 임의 지정시
                range.range.lvl["gte"] = Number(level_min / 100).toFixed(2);
                range.range.lvl["lte"] = Number(level_max / 100).toFixed(2);

                requery.function_score.query.bool.must.push(range);
                reverse_query.function_score.query.bool.must.push(range);
            } else {
                if (level == 1) { // 조금더 어려운문제 추천 요청
                    if (last_item_level > 0) {	// 마지막 풀이 문항 존재시
                        min_range = Number(last_item_level) - 15;
                        max_range = Number(last_item_level) - 5;
                    } else {
                        min_range = min_range - 15;
                        max_range = max_range - 5;
                    }
                    if (max_range < 25) max_range = 25;
                    if (min_range > 90) min_range = 90;
                } else if (level == -1) {	// 조금더 쉬운문제 추천 요청
                    if (last_item_level > 0) {	// 마지막 풀이 문항 존재시
                        min_range = Number(last_item_level) + 5;
                        max_range = Number(last_item_level) + 15;
                    } else {
                        min_range = Number(user_level) * 10 + 5;
                        max_range = Number(user_level) * 10 + 15;
                    }
                    if (max_range < 25) max_range = 25;
                    if (min_range > 90) min_range = 90;
                } else if (is_correct == 1) {	// 이전 풀이 문항이 맞았을 경우
                    if (last_item_level > 0) {
                        min_range = Number(last_item_level) - 7;
                        max_range = Number(last_item_level) + 3;
                    } else {
                        min_range = min_range - 7;
                        max_range = max_range + 3;
                    }
                    if (max_range < 25) max_range = 25;
                    if (min_range > 90) min_range = 90;
                } else {
                    if (last_item_level > 0) {
                        min_range = Number(last_item_level) - 3;
                        max_range = Number(last_item_level) + 7;
                    } else {
                        min_range = min_range - 3;
                        max_range = max_range + 7;
                    }
                    if (max_range < 25) max_range = 25;
                    if (min_range > 90) min_range = 90;
                }
                if (random == 0) {
                    range.range.lvl["gte"] = Number(min_range / 100).toFixed(2);
                    range.range.lvl["lte"] = Number(max_range / 100).toFixed(2);
                    // reverse_range query에만 추가.
                    reverse_range.range.lvl["lte"] = Number(max_range / 100).toFixed(2);
                    console.log("min_range :", min_range);
                    console.log("max_range :", max_range);
                    console.log("last_item_level :", last_item_level);
                }

                if (random == 0) {
                    if (is_correct == 1) {
                        sort = [{"lvl": {"order": "desc"}}];
                        reverse_sort = [{"lvl": {"order": "desc"}}];
                    } else {
                        sort = [{"lvl": {"order": "asc"}}];
                        reverse_sort = [{"lvl": {"order": "asc"}}];
                    }
                }

                requery.function_score.query.bool.must.push(range);
                reverse_query.function_score.query.bool.must.push(reverse_range);

            }

            s_body = {
                "size": item_num,
                "query": requery
            };
            console.log("requery Query: %j", s_body);

            // ES검색 쿼리 실행
            elasticsearch.client1.search({
                index: source_index_wf3,
                searchType: search_type,
                body: s_body
            }).then(function (resp) {
                let total = resp.hits.total;

                if (total > 0) {
                    console.log("[aiRcmnd] Last Query %j", s_body);
                    // 함수 클로져(Closure) 부모 함수에서 선언된 지역변수 body type of Object
                    body.user_grade = (lvl * 10).toFixed();
                    body.items = [];
                    for (let hit in resp.hits.hits) {
                        let result = resp.hits.hits[hit];
                        let item = {};
                        item["item_id"] = result._source.item_id;
                        console.log("[SHPARK] item_id: %j", result._source.item_id);
                        item["cate_cd_3"] = result._source.cate_cd_3 + ""
                        item["item_level"] = result._source.lvl * 100;
                        item["score"] = result._source.lvl * 100; //TODO: item_level로 변환. 삭제 예정
                        body.items.push(item);
                    }
                    return Promise.race([workflow4(req, res)]);
                } else {
                    // 검색결과가 존재하지 않는 경우
                    // ES 검색 쿼리 재실행(Reverse Range) 쿼리 사용
                    s_body = {
                        "size": item_num,
                        "query": reverse_query,
                        "sort": reverse_sort
                    };

                    console.log("reverse_query Query: %j", s_body);
                    elasticsearch.client1.search({
                        index: source_index_wf3,
                        searchType: search_type,
                        body: s_body
                    }).then(function (resp) {
                        console.log("[aiRcmnd] Last Query [Reverse] %j", s_body);
                        let total = resp.hits.total;

                        if (total > 0) {
                            body.user_grade = (lvl * 10).toFixed();
                            body.items = [];
                            for (let hit in resp.hits.hits) {
                                let result = resp.hits.hits[hit];
                                let item = {};
                                item["item_id"] = result._source.item_id;
                                console.log("[aiRcmnd] item_id: %j", result._source.item_id);
                                item["cate_cd_3"] = result._source.cate_cd_3 + "";
                                item["item_level"] = result._source.lvl * 100;
                                item["score"] = result._source.lvl * 100; //TODO: item_level로 변환. 삭제 예정
                                body.items.push(item);

                            }
                            return Promise.race([workflow4(req, res)]);
                        } else {
                            if (wf2_res.length > 0) {
                                status = 302;
                                res.status(status).send(res_err(req, status, '분류체계내 문항은 이미 다 풀어본 문항입니다.'));
                            } else {
                                status = 301;
                                res.status(status).send(res_err(req, status, '분류체계내 문항이 없습니다.'));
                            }
                        }
                        return resolve
                        //return Promise.race([workflow4(req, res)]);
                    });
                }
            });

        })
    }
    // workflow4 추천문항 3개의 문제풀이 정답률 집계
    let workflow4 = function (req, res) {
        return new Promise(function (resolve, reject) {
            wf3_res = body.items;
            let wf4_res = [];


            if (wf3_res.length > 0) { // 검색결과가 존재하는 경우
                let requery = {
                    "bool": {
                        "should": []
                    }
                };

                for (let wf3_cnt in wf3_res) {
                    let wf3_data = wf3_res[wf3_cnt];
                    let item_id = wf3_data.item_id + "";

                    if (item_id != '') {
                        let item_match = {"match": {"data.item_id": item_id}};
                        requery.bool.should.push(item_match);
                    }
                }

                let aggs = {
                    "item_id": {
                        "terms": {
                            "field": "data.item_id.keyword",
                            "size": 10
                        },
                        "aggs": {
                            "select_num": {
                                "terms": {
                                    "field": "data.select_num.keyword",
                                    "size": 10
                                },
                                "aggs": {
                                    "is_correct": {
                                        "terms": {
                                            "field": "data.is_correct.keyword",
                                            "size": 10
                                        }
                                    }
                                }
                            },
                            "avg": {
                                "avg": {
                                    "field": "data.learning_time"
                                }
                            }
                        }
                    }
                };

                s_body = {
                    "size": 0,
                    "query": requery,
                    "aggs": aggs
                };

                elasticsearch.client1.search({
                    index: source_index_wf2,
                    searchType: search_type,
                    body: s_body
                }).then(function (resp) {
                    let item_arr = resp.aggregations.item_id.buckets;

                    for (let wf3_cnt in wf3_res) {
                        wf3_res[wf3_cnt].avg_time = "0";
                        wf3_res[wf3_cnt].answer_count = 0;
                        wf3_res[wf3_cnt].answer_1_count = 0;
                        wf3_res[wf3_cnt].answer_2_count = 0;
                        wf3_res[wf3_cnt].answer_3_count = 0;
                        wf3_res[wf3_cnt].answer_4_count = 0;
                        wf3_res[wf3_cnt].answer_5_count = 0;
                        wf3_res[wf3_cnt].answer_6_count = 0;
                        wf3_res[wf3_cnt].correct_rate = 0;
                    }

                    if (item_arr.length > 0) {
                        for (let item_cnt in item_arr) {
                            let item_data = item_arr[item_cnt];

                            let item_id = item_data.key;
                            let answer_count = item_data.doc_count;
                            let select_arr = item_data.select_num.buckets;
                            let avg_time = item_data.avg.value;

                            let correct_cnt = 0;
                            let ans_1_cnt = 0;
                            let ans_2_cnt = 0;
                            let ans_3_cnt = 0;
                            let ans_4_cnt = 0;
                            let ans_5_cnt = 0;
                            let ans_6_cnt = 0;
                            let total_time = 0;

                            for (let select_cnt in select_arr) {
                                let sel_data = select_arr[select_cnt];
                                let sel = sel_data.is_correct.buckets[0];

                                if (sel_data.key == "1") {
                                    if (sel.key == "1") correct_cnt = sel.doc_count;
                                    ans_1_cnt = sel_data.doc_count;
                                } else if (sel_data.key == "2") {
                                    if (sel.key == "1") correct_cnt = sel.doc_count;
                                    ans_2_cnt = sel_data.doc_count;
                                } else if (sel_data.key == "3") {
                                    if (sel.key == "1") correct_cnt = sel.doc_count;
                                    ans_3_cnt = sel_data.doc_count;
                                } else if (sel_data.key == "4") {
                                    if (sel.key == "1") correct_cnt = sel.doc_count;
                                    ans_4_cnt = sel_data.doc_count;
                                } else if (sel_data.key == "5") {
                                    if (sel.key == "1") correct_cnt = sel.doc_count;
                                    ans_5_cnt = sel_data.doc_count;
                                } else if (sel_data.key == "6") {
                                    if (sel.key == "1") correct_cnt = sel.doc_count;
                                    ans_6_cnt = sel_data.doc_count;
                                }
                            }

                            for (let wf3_cnt in wf3_res) {
                                if (wf3_res[wf3_cnt].item_id == item_id) {
                                    wf3_res[wf3_cnt].avg_time = avg_time.toFixed() + "";
                                    wf3_res[wf3_cnt].answer_count = answer_count;
                                    wf3_res[wf3_cnt].answer_1_count = ans_1_cnt;
                                    wf3_res[wf3_cnt].answer_2_count = ans_2_cnt;
                                    wf3_res[wf3_cnt].answer_3_count = ans_3_cnt;
                                    wf3_res[wf3_cnt].answer_4_count = ans_4_cnt;
                                    wf3_res[wf3_cnt].answer_5_count = ans_5_cnt;
                                    wf3_res[wf3_cnt].answer_6_count = ans_6_cnt;
                                    wf3_res[wf3_cnt].correct_rate = Number(((correct_cnt / answer_count) * 100).toFixed());
                                }
                            }
                        }
                        body.items = wf3_res;
                    }
                    return resolve;
                    //return Promise.race([sendresult(req, res)]);
                });
            }
        });
    };

    // ErrorHandler
    let errhandler = function (req, res, err) {
        return new Promise(function (resolve, reject) {
            status = 500;
            res.status(status).send(res_err(req, status, err.message));
            return resolve();
        })
    };

    let sendresult = function (req, res) {
        return new Promise(function (resolve, reject) {
            res.send(res_ok(req, body, elapsed));
            return resolve();
        });
    };

    Promise
        .all([workflow1(req, res)])
        .then(function () {
            return workflow2(req, res);
        })
        .then(function () {
            return workflow3(req, res);
        })
        .then(function () {
            return workflow4(req, res);
        })
        .then(function () {
            return sendresult(req, res);
        })
        .catch(function (err) {
            return errhandler(req, res, err);
        })
});


/* IF-EBS-005 강좌 추천 */
/* 예시 URL : /search/lctrRcmnd?user_id=@hrbn1453&target_cd=D200&cate_cd_1=B100&user_level=3 */
app.all('/lctrRcmnd', (req, res, next) => {
    let s_body = {};
    let user_id = req.body.user_id || req.query.user_id || '';
    let user_level = req.body.user_level || req.query.user_level || 0;
    let cate1 = req.body.cate_cd_1 || req.query.cate_cd_1 || '';
    let cate2 = req.body.cate_cd_2 || req.query.cate_cd_2 || '';
    let target_cd = req.body.target_cd || req.query.target_cd || '';
    let total_recommend = req.body.size || req.query.size || 30;

    let usr_grd = 0;
    let cate2_arr = [];
    if (cate2.indexOf(",") != -1) {
        cate2_arr = cate2.split(',');
    } else {
        cate2_arr.push(cate2);
    }

    // const source_index_wf1 = "v1-user-solution_modify";
    const source_index_wf1 = "ai-user-grade";
    const source_index_wf2 = "v1-subj-ml";
    const sort_order = "desc";
    const max_score = 100.0;
    const min_score = 90.0;
    const minimum_score = 1.0;

    // elapsed time
    let elapsed = {};
    let start, end;

    // result
    let wf2_res;
    let body = {};

    let code_list = [];
    code_list["A100"] = "1000001,2000001,2000002";
    code_list["A200"] = "1004737,2000004,2000005";
    code_list["A300"] = "1000678,1001179,2000003";
    code_list["A400"] = "1002512,2000008";
    code_list["A500"] = "1001598,2000007";
    code_list["A600"] = "1004889,2000009";
    code_list["A700"] = "2000010,1003249";
    code_list["A800"] = "2000006,1001043,1000546";
    code_list["B100"] = "1000001,2000001,2000002";
    code_list["B200"] = "1004737,2000004,2000005";
    code_list["B300"] = "1000678,1001179,2000003";
    code_list["B400"] = "1001598,2000007";
    code_list["B500"] = "1002512,2000008";
    code_list["B600"] = "2000010,1003249";
    code_list["B700"] = "1004889,2000009";
    code_list["B800"] = "2000006,1001043,1000546";

    let code_list_2 = [];
    code_list_2["B40060"] = "1002242,2000687";
    code_list_2["B40061"] = "1002410,2000684";
    code_list_2["B40003"] = "1001852,2000688";
    code_list_2["B50053"] = "1002631,2001385";
    code_list_2["B40064"] = "1002081,2001881";
    code_list_2["B40065"] = "1001733,2000685";
    code_list_2["B40066"] = "1002318,2000683";
    code_list_2["B40067"] = "1002020,2000681";
    code_list_2["B50054"] = "1002802,2001387";
    code_list_2["B40055"] = "1001599,2000682";
    code_list_2["B50052"] = "1002980,2001383";
    code_list_2["B40056"] = "1001852,2000688";
    code_list_2["B40058"] = "1002081,2001881";
    code_list_2["B40057"] = "1002020,2000681";
    code_list_2["B40068"] = "1001599,2000682";
    code_list_2["B40052"] = "1002081,2001881";
    code_list_2["B70016"] = "1004890,2001947";
    code_list_2["B70020"] = "1004890,2001947,1005085,2002365";
    code_list_2["B50003"] = "1002631,2001385";
    code_list_2["B50007"] = "1002715,2001386";
    code_list_2["B40016"] = "1002081,2001881";
    code_list_2["B40009"] = "1001733,2000685";
    code_list_2["B40007"] = "1002318,2000683";
    code_list_2["B70021"] = "1005111,2002264,1005142,2001945";
    code_list_2["B60005"] = "1003787";
    code_list_2["B60003"] = "1003997";
    code_list_2["B40015"] = "1002020,2000681";
    code_list_2["B60002"] = "1004108";
    code_list_2["B60004"] = "1004271";
    code_list_2["B50004"] = "1002802,2001387";
    code_list_2["B50008"] = "1002876,2001388";
    code_list_2["B60007"] = "1004414";
    code_list_2["B40004"] = "1001599,2000682";
    code_list_2["B60006"] = "1004542";
    code_list_2["B50002"] = "1002980,2001383";
    code_list_2["B50006"] = "1003086,2001384";
    code_list_2["B70005"] = "1005085,2002365";
    code_list_2["A60022"] = "1004920,2001946,1004986";
    code_list_2["A50006"] = "1002242,2000687";
    code_list_2["A60019"] = "1005007,2001944,1005033,2002363";
    code_list_2["A40000"] = "1003137";
    code_list_2["A60018"] = "1005034,2002366,1005060,2002364";
    code_list_2["A60002"] = "1005060,2002364";
    code_list_2["A60001"] = "1005034,2002366";
    code_list_2["A70001"] = "1003414";
    code_list_2["A50013"] = "1002410,2000684";
    code_list_2["A70008"] = "1003595";
    code_list_2["A40001"] = "1002513";
    code_list_2["A40005"] = "1002573";
    code_list_2["B50051"] = "2001381";
    code_list_2["A50012"] = "1001936";
    code_list_2["A70009"] = "1003250";
    code_list_2["B40059"] = "1002180";
    code_list_2["B40063"] = "1001852,2000688";
    code_list_2["A60016"] = "1004890,2001947";
    code_list_2["A60020"] = "1004890,2001947,1005085,2002365";
    code_list_2["A40003"] = "1002631,2001385";
    code_list_2["A40007"] = "1002715,2001386";
    code_list_2["A50016"] = "1002081,2001881";
    code_list_2["A50009"] = "1001733,2000685";
    code_list_2["A50007"] = "1002318,2000683";
    code_list_2["A60021"] = "1005111,2002264,1005142,2001945";
    code_list_2["A70005"] = "1003787";
    code_list_2["A70003"] = "1003997";
    code_list_2["A50015"] = "1002020,2000681";
    code_list_2["A70002"] = "1004108";
    code_list_2["B40062"] = "2000686";
    code_list_2["A70004"] = "1004271";
    code_list_2["A40004"] = "1002802,2001387";
    code_list_2["A40008"] = "1002876,2001388";
    code_list_2["B50055"] = "1005282,2001380";
    code_list_2["B40050"] = "1005286,2000680";
    code_list_2["A70007"] = "1004414";
    code_list_2["A50004"] = "1001599,2000682";
    code_list_2["A70006"] = "1004542";
    code_list_2["A40002"] = "1002980,2001383";
    code_list_2["A40006"] = "1003086,2001384";
    code_list_2["A60005"] = "1005085,2002365";

    let workflow1 = function (req, res) {
        return new Promise(function (resolve, reject) {
            let requery = {
                "bool": {
                    "must": []
                }
            };

            // 사용자ID match 쿼리 생성
            let user_match = {
                "match": {
                    "user_id": user_id
                }
            };
            requery.bool.must.push(user_match);

            // cateCd1 값이 존재하는 경우 match 쿼리 생성
            let cate1_arr = [];
            if (code_list[cate1] != null) {
                cate1_arr = replace_split(code_list[cate1]);
            }
            if (cate1_arr != null) {
                let should_match = {
                    "bool": {
                        "should": []
                    }
                };
                for (let cate1_val in cate1_arr) {
                    let cate1_match = {
                        "match": {
                            "Level_1.code": cate1_arr[cate1_val]
                        }
                    };
                    should_match.bool.should.push(cate1_match);
                }
                requery.bool.must.push(should_match);
            } else if (cate1 != '' || cate1 != undefined) {
                let cate1_match = {
                    "match": {
                        "Level_1.code": cate1
                    }
                };
                requery.bool.must.push(cate1_match);
            }
            s_body = {
                "query": requery
            };
            console.log();

            // wf1 Search
            elasticsearch.client.search({
                index: source_index_wf1,
                searchType: search_type,
                body: s_body
            }).then(function (resp) {
                let hits = resp.hits.hits;
                for (let hits_cnt in hits) {
                    let hit = hits[hits_cnt];

                    let levels1 = hit._source.Level_1;
                    // 사용자의 영역별 데이터 중 입력 받은 cate1 값과 동일한 값이 있으면 변수에 저장
                    for (let lv1_cnt in levels1) {
                        let lv1 = levels1[lv1_cnt];
                        if (lv1.code == cate1) {
                            usr_grd = lv1.grade;
                        }

                        //입력받은 과목코드가 있을 때만 Level_2 탐색
                        if (cate2_arr.length > 0) {
                            for (let cate2_cnt in cate2_arr) {
                                let cate2 = cate2_arr[cate2_cnt];

                                if (cate2 != '') {
                                    let levels2 = lv1.Level_2;
                                    for (let lv2_cnt in levels2) {
                                        let lv2 = levels2[lv2_cnt];

                                        if (lv2.code == cate2) {
                                            usr_grd = lv2.grade;
                                        }
                                    }
                                }
                            }
                        }

                    }
                }
            })

        });
    }

});


function replace_split(str) {
    var arr = [];

    if (str != "" && str != undefined) {
        str = str.replace(/(^\s*)|(\s*$)/gi, "");
        arr = str.split(",");
    }

    return arr;
}

function find_in_arr(lv1, code, level_limit) {

    let result = {};

    for (let cnt1 in lv1) {
        let arr1 = lv1[cnt1];

        let test = jsonQuery("Level_2[code=" + code + "]", {data: arr1}).value;
        let isLevel2 = jsonQuery("Level_2[code=" + code + "]", {data: arr1}).value;
        let isLevel3 = jsonQuery("Level_2[Level_3][code=" + code + "]", {data: arr1}).value;
        let isLevel4 = jsonQuery("Level_2[Level_3][Level_4][code=" + code + "]", {data: arr1}).value;
        if (arr1.code == code || isLevel2 != null || isLevel3 != null || isLevel4 != null) {
            result["Level_1"] = []
            result["Level_1"].push(arr1);
            let isDelete = 0;

            if (level_limit >= 4) {
                for (let sub_cnt1 in result.Level_1) {
                    for (let sub_cnt2 in result.Level_1[sub_cnt1].Level_2) {
                        for (let sub_cnt3 in result.Level_1[sub_cnt1].Level_2[sub_cnt2].Level_3) {
                            for (let sub_cnt4 in result.Level_1[sub_cnt1].Level_2[sub_cnt2].Level_3[sub_cnt3].Level_4) {
                                delete result.Level_1[sub_cnt1].Level_2[sub_cnt2].Level_3[sub_cnt3].Level_4[sub_cnt4].Level_5;
                                if (result.Level_1[sub_cnt1].Level_2[sub_cnt2].Level_3[sub_cnt3].Level_4[sub_cnt4].code == "") {
                                    delete result.Level_1[sub_cnt1].Level_2[sub_cnt2].Level_3[sub_cnt3].Level_4[sub_cnt4];
                                }
                            }
                            if (isLevel3 != null && result.Level_1[sub_cnt1].Level_2[sub_cnt2].Level_3[sub_cnt3].code != code) {
                                delete result.Level_1[sub_cnt1].Level_2[sub_cnt2].Level_3[sub_cnt3];
                            } else {
                                if (result.Level_1[sub_cnt1].Level_2[sub_cnt2].Level_3[sub_cnt3].code == "") {
                                    delete result.Level_1[sub_cnt1].Level_2[sub_cnt2].Level_3[sub_cnt3];
                                }
                            }
                        }
                        if (isDelete == 1 || (isLevel2 != null && result.Level_1[sub_cnt1].Level_2[sub_cnt2].code.trim() != code)) {
                            delete result.Level_1[sub_cnt1].Level_2[sub_cnt2];
                        } else {
                            isDelete = 1;
                        }
                    }
                }
                isDelete = 1;
            } else if (level_limit >= 3) {
                for (let sub_cnt1 in result.Level_1) {
                    for (let sub_cnt2 in result.Level_1[sub_cnt1].Level_2) {
                        for (let sub_cnt3 in result.Level_1[sub_cnt1].Level_2[sub_cnt2].Level_3) {
                            if (isLevel3 != null && result.Level_1[sub_cnt1].Level_2[sub_cnt2].Level_3[sub_cnt3].code != code) {
                                delete result.Level_1[sub_cnt1].Level_2[sub_cnt2].Level_3[sub_cnt3];
                                isDelete = 1;
                            } else {
                                delete result.Level_1[sub_cnt1].Level_2[sub_cnt2].Level_3[sub_cnt3].Level_4;

                                if (result.Level_1[sub_cnt1].Level_2[sub_cnt2].Level_3[sub_cnt3].code == "") {
                                    delete result.Level_1[sub_cnt1].Level_2[sub_cnt2].Level_3[sub_cnt3];
                                }
                            }
                        }
                        if (isDelete == 1 || (isLevel2 != null && result.Level_1[sub_cnt1].Level_2[sub_cnt2].code != code)) {
                            delete result.Level_1[sub_cnt1].Level_2[sub_cnt2];
                        } else {
                            if (result.Level_1[sub_cnt1].Level_2[sub_cnt2].code == "") {
                                delete result.Level_1[sub_cnt1].Level_2[sub_cnt2];
                            }
                            isDelete = 1;
                        }
                    }
                }
                isDelete = 1;
            } else if (level_limit >= 2) {
                for (let sub_cnt1 in result.Level_1) {
                    for (let sub_cnt2 in result.Level_1[sub_cnt1].Level_2) {
                        delete result.Level_1[sub_cnt1].Level_2[sub_cnt2].Level_3;
                        if (isLevel2 != null && result.Level_1[sub_cnt1].Level_2[sub_cnt2].code != code) {
                            delete result.Level_1[sub_cnt1].Level_2[sub_cnt2];
                        } else {
                            if (result.Level_1[sub_cnt1].Level_2[sub_cnt2].code == "") {
                                delete result.Level_1[sub_cnt1].Level_2[sub_cnt2];
                            }
                        }
                    }
                }
            } else if (level_limit >= 1) {
                for (let sub_cnt1 in result.Level_1) {
                    delete result.Level_1[sub_cnt1].Level_2;
                }
            }
        }
    }

    return cleanDeep(result);
}


module.exports = app;

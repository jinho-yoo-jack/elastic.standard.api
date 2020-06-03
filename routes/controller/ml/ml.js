const app = require('express')();
const validator = require('express-validator');
const APPROOT = require('app-root-path');
const moment = require('moment');
const md5 = require('md5');
const fs = require('fs');

// import User Module
const res_ok = require(APPROOT + '/lib/res_ok');
const res_err = require(APPROOT + '/lib/res_err');
const elasticsearch = require(APPROOT + '/models/elasticsearch');
const config = require(APPROOT + '/config/config');

// Setting Redis Configure
const redis = require('redis');
const client = redis.createClient(6379, '192.168.13.41');

// Middleware
app.use(validator());

let search_type = "dfs_query_then_fetch";

// Routing
// @subj-apply 사용자 등급 update
app.all('/addSubjApplyGrd', (req, res, next) => {
    let s_body    = {};
    let body      = {};
    let wf1_total = 1;
    let wf1_pg    = req.query.page  || req.body.page  || 0;
    let wf1_limit = req.query.limit || req.body.limit || 0;

    const source_index_wf1 = "v1-subj-apply-*";
    const source_index_wf2 = "v1-user-solution_modify";
    const size = 5000;

    const workflow1 = (req, res) => {
        return new Promise(function (resolve, reject) {
            // from 카운트가 전체 건수보다 높으면 결과송출 함수로 return
            if (wf1_pg > wf1_total) return Promise.race([sendresult(req, res)]);

            // 전체 건수를 알기 위한 쿼리
            s_body = {
                "size": 0,
                "query": {
                    "match_all": {}
                }
            };

            // ES 쿼리 실행
            elasticsearch.client1.search({
                index: source_index_wf1,
                searchType: search_type,
                body: s_body
            }).then((resp) => {
                wf1_total = resp.hits.total; // Index 전체 건수 획득

                s_body = {
                    "from": wf1_pg,
                    "size": size,
                    "query": {
                        "match_all": {}
                    }
                };

                // ES 검색 쿼리 실행
                elasticsearch.client1.search({
                    index: source_index_wf1,
                    searchType: search_type,
                    body: s_body
                }).then(function (resp) {
                    req.query.hits = resp.hits.hits;
                    req.query.wf1_pg = wf1_pg;

                    // 반복횟수 제한을 위한 변수 wf1_limit 가 초기화된 0 일 때,
                    // 전체 건수로 초기화
                    if (wf1_limit == 0) wf1_limit = wf1_total;

                    // workflow2 함수로 return
                    return Promise.race([workflow2(req, res)]);
                });
            });
        });
    };

    // workflow1 검색결과에서 user_id 를 이용하여
    // 숫자로만 구성된 user_id를 redis에서 가져온 후 파일로 출력
    const workflow2 = function (req, res) {
        return new Promise(function (resolve, reject) {

            let wf1_res = req.query.hits; // workflow1 검색결과 중 hits;

            for (let result_count in wf1_res) {
                let res = wf1_res[result_count];
                let user_id = res._source.user_id;
                let cate_cd_1 = res._source.cate_cd_1;

                s_body = {
                    "from": wf1_pg,
                    "size": size,
                    "query": {
                        "match": {
                            "user_id": user_id
                        }
                    }
                };

                // ES 검색 쿼리 실행
                elasticsearch.client1.search({
                    index: source_index_wf2,
                    searchType: search_type,
                    body: s_body
                }).then(function (resp) {
                    let results = resp.hits.hits;

                    for (let i in results) {
                        let result = results[i];
                        let lv1 = result._source.Level_1;

                        for (let lv_cnt in lv1) {
                            let logger.info = lv1[lv_cnt];

                            if (logger.info.code == cate_cd_1) {
                                let index_body = {"doc": {}};
                                cate_cd_1 += "@" + logger.info.grade;
                                index_body.doc.cate_cd_1 = cate_cd_1;

                                let script_body = {
                                    "script": {
                                        "source": "ctx._source['cate_cd_1'] = " + "'" + cate_cd_1 + "'"
                                    }
                                };

                                let index_data = {
                                    index: res._index,
                                    id: res._id,
                                    type: res._type,
                                    body: script_body
                                };

                                console.log("wf2 index_data --%j", index_data);
                                elasticsearch.client1.update(index_data, function (err, results) {
                                    if (err != undefined) {
                                        console.log(err);
                                    } else {
                                        console.log(results);
                                    }
                                });
                            }
                        }
                    }
                })
            }
        });
    };
    console.log("pg_limit " + wf1_pg + " / " + wf1_limit);

    // page > limit 보다 크면 결과출력 함수로,
    // 그렇지 않다면 page + size 후, workflow1로 다시 전달
    if (wf1_pg > wf1_limit) {
        return Promise.race([sendresult(req, res)]);

    } else {
        return Promise.race([workflow1(req, res)]);
    }

    // 결과 출력 함수
    let sendresult = function (req, res) {
        return new Promise(function (resolve, reject) {
            body.result = "작업이 완료 되었습니다.";
            res.send(res_ok(req, body, elapsed));

            return resolve();
        });
    };

    let errhandler = function (req, res, err) {
        return new Promise(function (resolve, reject) {
            res.status(500).send(res_err(req, 500, err.message));
            return resolve();
        })
    };

    Promise
        .all([workflow1(req,res)])
        .catch(function(err){
            return errhandler(req, res, err);
        });
});


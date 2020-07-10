const APPROOT = require('app-root-path');
const cleanDeep = require('clean-deep');
const jsonQuery = require('json-query');
const Util = require(`${APPROOT}/util/util`);

const userGrdInfo = (paramSet, searchResult, res) => {

    let cate1 = paramSet.cate1 || '';
    let cate2 = paramSet.cate2 || '';
    let cate3 = paramSet.cate3 || '';
    let cate4 = paramSet.cate4 || '';
    let cate5 = paramSet.cate5 || '';
    let level_limit = paramSet.level_limit || 3;

    const responseBody = {};
    const results = [];

    let hits = searchResult.hits.hits;
    for (let cnt in hits) {
        const obj = {};
        let category = {};
        let result_arr = hits[cnt];

        if ((cate1 + cate2 + cate3 + cate4 + cate5) != "") {
            let cate_cd = '';
            if (cate5.lengthlength > 0) cate_cd = cate5;
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

        if (result_arr._index.length == 26) obj.base_date = result_arr._index.substring(16, 20) + "-" + result_arr._index.substring(21, 23) + "-" + result_arr._index.substring(24);
        else obj.base_date = null;
        let top_depth = Object.keys(category);
        obj[top_depth] = category[top_depth];

        results.push(obj);
    }
    responseBody.users = results;
    res.send(Util.sendResStatusByOk(paramSet, responseBody, null));

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

module.exports = userGrdInfo;

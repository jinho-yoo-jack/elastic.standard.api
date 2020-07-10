const APPROOT = require('app-root-path');
const config = require(APPROOT + '/config/config');
const elasticsearch = require('elasticsearch');

// Class Elasticsearch
// Design Pattern by Singleton
class Elasticsearch {
    // In ES2019, the ability to define "private" class fields using a hash `#` prefix is added.
    static #instance;
    static #engineMode;
    /*
    * Constructor
    * @param mode : SE 또는 RE
    * */
    constructor(mode) {
        // 1. Check Existed Instance
        if(Elasticsearch.#instance) {
            if(Elasticsearch.#engineMode == mode)
                // 1-1. Return Existed Instance
                return Elasticsearch.#instance;
        }

        // 2. Set private members
        Elasticsearch.#instance = this;
        Elasticsearch.#engineMode = mode;

        /*
        * Getter
        * */
        Elasticsearch.getInstance = () => {
            console.log(Elasticsearch.#instance);
            if (Elasticsearch.#instance) {
                return this;
            }
            return Elasticsearch.#instance;
        };

        Elasticsearch.getEngineMode = () => {
            return Elasticsearch.#engineMode;
        }

        this.elasticClient = new elasticsearch.Client({
            host: config["ELASTICSEARCH_" + mode + "_HOST"],
            requestTimeout: config.ELASTICSEARCH_TIMEOUT
        });
    };

    // @Override Object.toString();
    toString = function getSearchEngineInfo() {
        console.log("##### Elasticsearch Info #####")
        console.log("##### [MODE] : ", this.mode);
        console.log("##### [HOST] : ", config["ELASTICSEARCH_" + mode + "_HOST"]);
    };

    /*
    * [client][search] : Single Index/Body Search
    * @param indexName : 검색 대상 index
    * @param searchQuery : 검색 Query
    * */
    singleSearch(indexName, searchQuery) {
        return this.elasticClient.search({
            index: indexName,
            body: searchQuery
        });
    };

    /*
    * [client][msearch] : Multi Index/Body Search
    * @param mapIndexQuery : typeof Map, _mapIndexQuery.set('indexName','searchQuery');
    * @param delimiterStr : Index 구분자
    * - IndexName 형태가 "v1-" + "인덱스명" = "v1-인덱스명" 일 경우에 사용.
    * */
    multiSearch(mapIndexQuery, delimiterStr) {
        let multiSearchQuery = [];
        for (let [indexName, searchQuery] of mapIndexQuery) {
            let index = {'index': delimiterStr + indexName};
            let query = searchQuery;

            multiSearchQuery.push(index);
            multiSearchQuery.push(query);
        }

        return this.elasticClient.msearch({
            headers: {"content-type": "application/json"},
            body: multiSearchQuery
        });

    };

    /*
    * [client][indices][close] : index status change from OPEN to CLOSE
    * @param indexName : 상태를 Close로 바꿀 인덱스명
    * */
    chageIdxStatByClose(indexName) {
        return elasticClient.indices.close({
            index: indexName
        });
    };

    /*
    * [indices][updateAliases] : Alias index update
    * @param aliasName : 인덱스 Alias명
    * @param lastIndexName : 해당 Alias로 설정할 Index
    * */
    updateAlias(aliasName, lastIndexName) {
        let updateQuery = {
            actions: [
                {
                    "remove": {
                        "index": "*", "alias": aliasName
                    }
                },
                {
                    "add": {
                        "index": lastIndexName, "alias": aliasName
                    }
                }
            ]
        };

        return this.elasticClient.indices.updateAliases({
            body: updateQuery
        });
    };

    /*
    * [indices][exists] : Check Exists Index
    * @param indexName : 존재여부를 확인하고 싶은 index명
    * */
    chkIdxExists(indexName) {
        return elasticClient.indices.exists({
            index: indexName,
        });
    };

    /*
    * [cat][indices] : Check Last Index
    * @param indexName : 최신 Index명을 확인하고 싶은 Index명(ex. v1-index-)
    * - v1-index-YYYY.mm.dd 일 경우, v1-index-*로 검색하여 오름차순으로 정렬된 index목록이 리턴된다.
    * */
    chkLastIndex(indexName) {
        return this.elsticClient.cat.indices({
            index: indexName + "*",
            format: 'json',
            s: 'index',
            h: 'index',
            v: true
        });
    };
}

//module.exports = new Elasticsearch("SE");
module.exports = Elasticsearch

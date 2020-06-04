const APPROOT = require('app-root-path');
const deepcopy = require('deepcopy');
const moment = require('moment');
const path = require('path');
const uuidv4   = require('uuid/v4');

const Util = require(`${APPROOT}/util/util.js`);
//const elasticsearch = require(`${APPROOT}/middleware/elasticsearch`);
const searchEngine = require(`${APPROOT}/middleware/searchEngine`);
const elasticsearch = new searchEngine("SE");
const Payload = require(`${APPROOT}/routes/models/payload/payload`);

const filename = path.basename(__filename);



// Process Execute Query
module.exports = {
    searchUserGrdInfo: async (param) => {
        let indexName = "ai-user-10grade";
        try {
            let request = deepcopy(param);
            // 1. Make payload
            const payload = Payload.searchUserGrdInfoQry(request);

            // 2. Select Index
            if (request.date_range == 0) {
                // # Modify #
                // date_range 입력값이 있을 경우에
                // 검색 대상 인덱스를 ai-user-grade10(ALIAS)가 아닌
                // 전체 ai-user-grade*로 변경.
                indexName = indexName + "*";
            } else {
                indexName = indexName + "*";
            }
            console.log(`IndexName [${indexName}] --- Query ::: %j`, payload);
            // 3. Call esService.API()
            //return await elasticsearch.singleSearch(indexName, payload);
            return await elasticsearch.singleSearch(indexName, payload);
        } catch (err) {
            console.log(err);
            throw err;
        }
    }
}

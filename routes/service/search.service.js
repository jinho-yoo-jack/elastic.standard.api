const APPROOT = require('app-root-path');
const deepcopy = require('deepcopy');
const path = require('path');

const Payload = require(`${APPROOT}/routes/models/payload/payload`);
const elasticQuery = require(`${APPROOT}/routes/models/payload/payload.model`);
const searchEngine = require(`${APPROOT}/middleware/elasticsearch`);
const elasticsearch = new searchEngine("SE");
const elasticsearch1 = new searchEngine("RE");


// Process Execute Query
module.exports = {
    getUsrGradeBy10: async (req) => {
        let indexName = "ai-user-10grade";

        try {
            let reqParams = deepcopy(req);
            // 1. Set Params return Type {Object}
            const setParams = Payload.setReqParams4UsrGradeBy10(reqParams);

            // 2. Create Query
            const searchQuery = elasticQuery.getQryUsrGradeBy10(setParams);

            // 3. Select Index
            if (reqParams.date_range == 0) {
                // # Modify #
                // date_range 입력값이 있을 경우에
                // 검색 대상 인덱스를 ai-user-grade10(ALIAS)가 아닌
                // 전체 ai-user-grade*로 변경.
                indexName = indexName + "*";
            } else {
                indexName = indexName + "*";
            }
            console.log(`IndexName [${indexName}] --- Query ::: %j`, searchQuery);

            // 3. Call esService.API()
            return await elasticsearch.singleSearch(indexName, searchQuery);

        } catch (err) {
            throw err;
        }
    }
}

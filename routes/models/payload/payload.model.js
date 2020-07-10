// Basic Template Elasticsearch Query
const esQryMaker = require('elastic-builder');
module.exports = {
    getQryUsrGradeBy10: (reqParams) => {
        const mustQuery = [
            esQryMaker.matchQuery('user_id', reqParams.user_id),
            esQryMaker.rangeQuery('base_date').gte(reqParams.gte).lte('now-1d/d').timeZone('Asia/Seoul'),
        ];

        const filterQuery = [];
        if(reqParams.dayOfWeekFilter !== undefined) {
            const dayOfWeekFilter = esQryMaker.scriptQuery(
                                        esQryMaker.script('source', reqParams.dayOfWeekFilter));
            filterQuery.push(dayOfWeekFilter);
        }

        const sortsQuery = [
            esQryMaker.sort('_index').order('desc')
        ];

        const query = esQryMaker
            .requestBodySearch()
            .from(0)
            .size(reqParams.size)
            .query(
                esQryMaker.boolQuery()
                    .must(mustQuery)
                    .filter(filterQuery)
            )
            .sorts(sortsQuery);

        console.log('queryBody ::: %j', query.toJSON());
        return query.toJSON();
    }
}
;

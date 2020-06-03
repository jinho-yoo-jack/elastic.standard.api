// Basic Template Elasticsearch Query
module.exports = {
    getUserGrdInfoPayload: () => {
        return {
            "size": 10,   // Default 값들은 여기에 설
            "from": 0,
            "query": {
                "bool": {
                    "must": [
                        {
                            "match": {
                                "user_id": "" // user_id 값을 payload에서 할당.
                            }
                        },
                        {
                            "range": {
                                "base_date": {
                                    "gte": "",
                                    "lte": "now-1d/d",
                                    "time_zone": "Asia/Seoul"
                                }
                            }
                        },
                        {
                            "bool": {
                                "should": [
                                    {
                                        "match": {
                                            "user_id": ""
                                        }
                                    }
                                ]
                            }
                        }
                    ],
                    "should": [],
                    "filter": []
                }
            },
            "sort": [
                {
                    "_index": {
                        "order": 'desc'
                    }
                }
            ]

        };
    }
};

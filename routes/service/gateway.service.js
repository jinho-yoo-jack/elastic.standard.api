const APPROOT = require('app-root-path');
const deepcopy = require('deepcopy');
const path = require('path');
const request = require('async-request');
const Util = require(`${APPROOT}/util/util`);
const Payload = require(`${APPROOT}/routes/models/payload/payload`);


// Process Execute Query
module.exports = {
    getServiceResult: async (req) => {
        try {
            let reqParams = deepcopy(req);
            // 1. gateway에 요청하는 서비스(serviceName)에 따라서 Request Parameters 설정
            const setParams = Payload.setReqParams4Gateway(reqParams);

            // 2. Request to OpenQuery Gateway
            // TEST URL : http://localhost:19200/service/autocomplete?keyword=aerom&label=autocomplete
            const serviceURL = Util.makeURL4Service(reqParams);
            console.log(serviceURL);
            let result = await request(serviceURL);
            result = JSON.parse(result.body);

            return result;
        } catch (err) {
            throw err;
        }
    }
}

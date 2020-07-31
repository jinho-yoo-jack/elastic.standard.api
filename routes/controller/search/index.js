const express = require('express');

const router = express.Router();
const controller = require('./search.controller');

// TEST URL
// http://localhost:14050/search/aiUser_range_10?user_id=@harrison1210&dayOfWeek=7&date_range=365&cate_cd_1=1001598&cate_cd_2=1001733&cate_cd_3=&logger.info_limit=4%20%EC%98%A4%EC%A0%84%2010:01
router.get('/getUserGrdInfo', controller.searchUsrGradeBy10);

module.exports = router;

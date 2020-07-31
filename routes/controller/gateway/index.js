const express = require('express');

const router = express.Router();
const controller = require('./gateway.controller');

router.all('/service', controller.service);

module.exports = router;

const search = require('./controller/search/index');
const gateway = require('./controller/gateway/index');

module.exports = function (app) {
  app.use('/search', search);
  app.use('/gateway', gateway);
};

const search = require('./controller/search/index');
module.exports = function (app) {
    app.use('/search', search);
};

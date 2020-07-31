const APPROOT = require('app-root-path');
const createError = require('http-errors');
const express = require('express');
const expressValidator = require('express-validator');
const path = require('path');
const cookieParser = require('cookie-parser');

const http = require('http');
const https = require('https');
const fs = require('fs');
// const schedule = require('node-schedule');

const proxyServer = require(`${APPROOT}/routes/index.server.route`);
const logger = require(`${APPROOT}/util/logger`)(module);

// Setting "routes"
// const searchRouter = require('./routes/controller/search/post.search');

// Create Server
const app = express();

// Cross Domain
const corsOptions = {
    origin: true,
    credentials: true,
};
// eslint-disable-next-line import/no-extraneous-dependencies
const CORS = require('cors')(corsOptions);

app.use(CORS);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(expressValidator());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// app.use('/search', searchRouter);
proxyServer(app);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler
app.use((err, req, res) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

// Setting "Https Option" & Create Server
const options = {
  key: fs.readFileSync('./ssl/newkey.pem'),
  cert: fs.readFileSync('./ssl/cert.pem'),
  ca: fs.readFileSync('./ssl/ThawteDigiCert-Newchain.pem'),
  passphrase: 'ebsism0#',
  requestCert: true,
};
https
  .createServer(options, app)
  .listen(14051, () => {
    logger.info('server bound');
  });

// Server Port
const port = '14050';
app.set('port', port);

// Create Http Server
const server = http.createServer(app);
server.listen(port);
function onListening() {
  const addr = server.address();
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
  logger.info(`Listening on ${bind}`);
}
server.on('listening', onListening);

module.exports = app;

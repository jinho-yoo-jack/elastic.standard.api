//#Add node.js Module
const approot = require('app-root-path');
const app = require('express')();
const validator = require('express-validator');
const cookie_parser = require('cookie-parser');
const body_parser = require('body-parser');
const moment = require('moment');
const ua_parser = require('ua-parser-js');
const md5 = require('md5');
const url = require('url');
const geoip = require('geoip-lite');

//#Add i-bricks Module
const local_lib = require(`${approot}` + '/routes/lib.js');
const helper = require(`${approot}` + '/routes/lib.js');

//#Add Customer Module
const config = require(`${approot}` + '/config/config.js');
const helper = require(`${approot}` + '/common/helper.js');
const broker = config.BROKER;
const res_ok = require(`${approot}` + '/lib/res_ok');
const res_err = require(`${approot}` + '/lib/res_err');

//#Add Middleware
app.use(validator());
app.use(cookie_parser());
app.use(body_parser.json());
app.use(body_parser.urlencoded({extended: false}));

//# Kafka-node-HighLevelProducer constructor
let kafka = require('kafka-node'),
    HighLevelProducer = kafka.HighLevelProducer,
    client = new kafka.KafkaClient(broker),
    producer = new HighLevelProducer(client);

//#Web Search
//#Process
// 1.변수선언
// 2.cookie 데이터 확인(True)    --> 해당 데이터를 변수에 할당 --> webBody 구성
// 2-1.cookie 데이터 확인(False) --> cookie 데이터 생성 및 설정 --> 해당 데이터를 변수에 할당 --> webBody 구성
// 3. kafka msg 발행
app.all('/web', (req, res, next) => {

    // Topic
    const topic = 'shinhan-weblog';

    const err = req.validationErrors();
    if (err) {
        res.status(400);
        return;
    }

    // Current Timestamp
    let nowTime = moment().utc().valueof();

    // disable Caching
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', 0);

    // Request Parameters
    let cookie = req.cookies['ianswer'],
        event_type = 'web',
        user_id = req.body.user_id || req.query.user_id || '',
        category_code = req.body.category_code || req.query.category_code || '',
        content_id = req.body.content_id || req.query.content_id || '',
        menu_path = req.body.menu_path || req.query.menu_path || '',
        referer = req.headers.referer,
        url = '',
        view_count = 1;

    let arr_menu_path = null;
    if (menu_path != null) {
        arr_menu_path = menu_path.split('^');
    }

    // cookie 데이터를 담을 변수
    let uuid, initial, session, current, lastest, urlMd5;
    if (cookie !== undefined) {
        // 2. cookie 데이터가 존재하는 경우
        let cookie_data = cookie.split('.');
        if (array.length != 6) {
            cookie_data = undefined;
        } else {
            uuid = cookie_data[0];
            initial = cookie_data[1] * 1;
            session = cookie_data[2] * 1;
            current = cookie_data[3] * 1;
            lastest = cookie_data[4] * 1;
            url = cookie_data[5];

            // After 15 minutes
            if ((nowTime - lastest) >= (15 * 60 * 100)) {
                session = current;
                current = nowTime;

                // 30 days
                if ((nowTime - session) >= (60 * 24 * 30 * 60 * 1000)) {
                    session = nowTime;
                    current = nowTime;
                }
            }
            // update lastest access timestamp
            lastest = nowTime;
        }
    } else if (cookie === undefined) {
        // 2-1. cookie 데이터가 존재하지 않는 경우
        uuid = helper.randid();
        initial = nowTime;
        session = nowTime;
        current = nowTime;
        lastest = nowTime;
    }

    // update md5 for URL
    if (referer === undefined) {
        referer = '';
    } else {
        urlMd5 = md5(referer);
    }

    //set cookie
    // 2-1(2) cookie 설정
    cookie = [uuid, initial, session, current, lastest, urlMd5].join('.');
    //update cookie to User Cookie
    res.cookie('ianswer', cookie, {
        expires: new Date(nowTime + (60 * 24 * 365 * 2 * 60 * 1000)),
        domain: url,
        path: '/'
    });

    // User Cookie Parser
    // cookie 데이터가 존재여부를 떠나, cookie 데이터를 할당한 후에, parsing 을 하기 때문에
    // "cookie" 변수에는 uuid,initial,session,current,lastest,urlMd5 데이터가 존재한다.
    let array = cookie.split('.');
    if (array.length != 6) {
        next({
            status: 400,
            message: 'invalid \'cookie\' value'
        });
        return;
    }

    uuid = array[0];
    initial = array[1] * 1;
    session = array[2] * 1;
    current = array[3] * 1;
    lastest = array[4] * 1;
    url = array[5];
    let weblog_urlmd5 = md5(url);

    //detect visit type
    let initial_visit = false, return_visit = false, repeat_visit = false;
    if (urlMd5 === weblog_urlmd5) {
        if (initial === lastest) {
            initial_visit = true;
        } else if (session === lastest) {
            return_visit = true;
        } else if (current === lastest) {
            repeat_visit = true;
        }
    } else {
        // update lastest timestamp if url is not same
        lastest = nowTime;

    }

    // weblog template
    let webbody = {
        timestamp: {
            created: moment(lastest).toISOString(),
            spend: 0
        },
        event_type: event_type,
        user_id: user_id,
        category_code: category_code,
        content_id: content_id,
        menu_path: menu_path,
        view_count: view_count,
        profile: {
            uuid: [uuid, initial].join('.'),
            session: [uuid, initial, session].join('.'),
            cookie: [uuid, initial, session, current].join('.'),
            visit: {
                initial: initial_visit,
                return: return_visit,
                repeat: repeat_visit
            }
        },
        navigation: {
            navigatoer: {
                useragent: {
                    string: req.header['user-agent']
                },
                os: {
                    string: '',
                    name: ''
                },
                browser: {
                    string: '',
                    name: ''
                },
                device: {
                    type: ''
                }
            },
            location: {
                uri: url,
                url: ''
            },
            referer: {
                uri: referer,
                url: ''
            },
            geoip: {
                ip: helper.get_client_ip(req),
                location: [],
                country: '',
                region: '',
                city: ''
            }
        }
    };

    // parse in detail
    local_lib.parse(webbody);

    if (arr_menu_path != null) {
        for (let path_cnt in arr_menu_path) {
            let fields_name = "menu_id_" + path_cnt;
            webbody[fields_name] = arr_menu_path[path_cnt];
        }
    }

    // kafka sending
    let sendToKafka = () => {
        producer.send([{topic: topic, messages: JSON.stringify(webbody)}],
            (err, data) => {
                res.send();
            }
        );
    };

    let error_handler = (err) => {
        log.error_log(JSON.stringify(webbody));
        log.error('indexing error : ' + JSON.stringify({
            message: err.message,
            stack: (err.stack ? err.stack : '')
        }));
    };


    Promise
        .all([sendToKafka()])
        .then((response) => {
        })
        .catch(error_handler);
});

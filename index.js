var express = require('express');
var path = require('path');
var port = process.env.PORT || 5000;

var http = require('http');

var request = require('request');
var qs = require('querystring');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var app = express();
var QuickBooks = require('node-quickbooks');
var Tokens = require('csrf');
var csrf = new Tokens();

const database = require('./lib/database');

const mongoose = require('mongoose'),
  Schema = mongoose.Schema,
  QBConfig = require('./models/qbconfig');

const qbconfigRepo = require('./lib/qbconfigRepository');
const util = require('util');

app.set('port', port);
app.set('appCenter', QuickBooks.APP_CENTER_BASE);
QuickBooks.setOauthVersion('2.0');

// Generic Express config
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.get('/', (req, res) => res.render('pages/qbconnect'));
app.get('/home', (req, res) => res.render('pages/home'));
app.listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});

// app.set('views', 'views');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({ resave: false, saveUninitialized: false, secret: 'smith' }));

app.use('/api_call', require('./routes/api_call.js'))

// INSERT YOUR CONSUMER_KEY AND CONSUMER_SECRET HERE

// SandBox
var consumerKey = 'Q0q63VIwq7SAQ8v6aop4mol1V6n0jk2lUB5WKu4LPN60wJLgBF';
var consumerSecret = 'gJaFcxJ8ouAx5RlQSkIjsjhwIUqfYXcP1IHaJeqC';

// PRODUCTION  
// var consumerKey = 'Q0VDE5PpLWcqaT2sZHjjFYHakq2vB6OBqa67Uhm7JrlyOSzski';
// var consumerSecret = 'FbEwwsfQi6V5DRUbjVAApAYjjMPuuz1161ipI1jg';


function initCustomMiddleware() {
  if (process.platform === "win32") {
    require("readline").createInterface({
      input: process.stdin,
      output: process.stdout
    }).on("SIGINT", () => {
      console.log('SIGINT: Closing MongoDB connection');
      database.close();
    });
  }

  process.on('SIGINT', () => {
    console.log('SIGINT: Closing MongoDB connection');
    database.close();
  });
}


function initDb() {
  database.open(() => { });
}

initCustomMiddleware();
initDb();


// OAUTH 2 makes use of redirect requests
function generateAntiForgery(session) {
  session.secret = csrf.secretSync();
  return csrf.create(session.secret);
};

app.get('/requestToken', function (req, res) {
  var redirecturl = QuickBooks.AUTHORIZATION_URL +
    '?client_id=' + consumerKey +
    '&redirect_uri=' + encodeURIComponent('http://localhost:5000/callback') +  //Make sure this path matches entry in application dashboard
    '&scope=com.intuit.quickbooks.accounting' +
    '&response_type=code' +
    '&state=' + generateAntiForgery(req.session);

  res.redirect(redirecturl);
});

app.get('/callback', function (req, res) {
  var auth = (new Buffer(consumerKey + ':' + consumerSecret).toString('base64'));
  console.log(auth);

  var postBody = {
    url: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + auth,
    },
    form: {
      grant_type: 'authorization_code',
      code: req.query.code,
      redirect_uri: 'http://localhost:5000/callback'  //Make sure this path matches entry in application dashboard
    }
  };

  request.post(postBody, function (e, r, data) {
    var accessToken = JSON.parse(r.body);

    saveQBConfig(accessToken.access_token, req.query.realmId, accessToken.refresh_token);

    // save the access token somewhere on behalf of the logged in user
    var qbo = new QuickBooks(consumerKey,
      consumerSecret,
      accessToken.access_token, /* oAuth access token */
      false, /* no token secret for oAuth 2.0 */
      req.query.realmId,
      true, /* use a sandbox account */
      true, /* turn debugging on */
      14, /* minor version */
      '2.0', /* oauth version */
      accessToken.refresh_token /* refresh token */);

    global.QuickBooksConfig = qbo;

    //res.render('pages/index');

  });
  res.send('<!DOCTYPE html><html lang="en"><head></head><body><script>window.opener.location.assign("/home");window.close();</script></body></html>');
});

function saveQBConfig(access_token, realmId, refresh_token) {

  console.log('*** saveQBConfig : ');

  let qbConfig = new QBConfig();
  qbConfig.consumerKey = consumerKey;
  qbConfig.consumerSecret = consumerSecret;
  qbConfig.access_token = access_token;
  qbConfig.realmId = realmId;
  qbConfig.refresh_token = refresh_token;

  QBConfig.remove({});

  qbconfigRepo.saveQBConfig(qbConfig, (err, data) => {
    if (err) {
      console.log('*** saveQBConfig error: ' + util.inspect(err));
    } else {
      console.log('*** QBConfig saved successfully!');
    }
  });

}
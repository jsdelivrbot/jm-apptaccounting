var request = require('request');
var express = require('express');
var router = express.Router();
var QuickBooks = require('node-quickbooks');

const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    UserInfo = require('../models/userInfo'),
    QBConfig = require('../models/qbconfig');

const qbconfigRepo = require('../lib/qbconfigRepository');
const util = require('util');

/** /api_call **/
router.get('/Tenants', function (req, res) {
    console.log("API: Tenants");

    var qbo = getQuickBooksConfig();

    if (qbo != undefined && qbo != null) {
        qbo.findCustomers(function (_, customers) {
            return res.json({ customers: customers.QueryResponse.Customer, statusCode: 200 });
        });
    }
});

router.get('/refreshTokens', function (req, res) {
    var gl = global.GLqbConfig;
    var auth = (new Buffer(gl.consumerKey + ':' + gl.consumerSecret).toString('base64'));

    var postBody = {
        url: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Basic ' + auth,
        },
        form: {
            grant_type: 'refresh_token',
            refresh_token: gl.refresh_token
        }
    };

    request.post(postBody, function (e, r, data) {
        var accessToken = JSON.parse(r.body);
    });
    return res.json({ statusCode: 200 });
});

router.post('/saveuserinfo', function (req, res) {
    console.log("API: saveuserinfo");

    let userInfo = new UserInfo();
    userInfo.email = req.body.email;
    userInfo.password = req.body.password;

    qbconfigRepo.saveUserInfo(req.body, (err, data) => {
        if (err) {
            console.log('*** saveuserinfo error: ' + util.inspect(err));
            return res.json({ status: { type: "error", msg: util.inspect(err) }, statusCode: 200 });
        } else {
            console.log('*** saveuserinfo ok');
            userInfo = data.userInfo;
            return res.json({ status: { type: "success", msg: "saveuserinfo successfully!" }, statusCode: 200 });
        }
    });

    return res.json({ statusCode: 200 });

});

router.post('/connecttojm', function (req, res) {


    console.log("API: connecttojm");

    let userInfo = new UserInfo();

    qbconfigRepo.getUserInfoByEmail(req.body.email, (err, data) => {
        if (err) {
            console.log('*** getUserInfoByEmail error: ' + util.inspect(err));
            return res.json({ status: { type: "error", msg: util.inspect(err) }, statusCode: 200 });
        } else {
            console.log('*** getUserInfoByEmail ok');
            userInfo = data;

            if (userInfo && userInfo.password === req.body.password) {

                console.log('*** getQBConfig');

                qbconfigRepo.getQBConfig((err, data) => {
                    if (err) {
                        console.log('*** getQuickBooksConfig error: ' + util.inspect(err));
                        qbConfig = null;
                    } else {
                        console.log('*** getQuickBooksConfig ok');
                        if (data.count > 0) {

                            qbConfig = data.qbConfig[0];
                            //qbConfig.access_token = "";
                            var QBSDK = getQuickBooksSDK(qbConfig);

                            if (QBSDK) {

                                QBSDK.getCompanyInfo(qbConfig.realmId, function (err, companyInfo) {

                                    if (err) {
                                        var auth = (new Buffer(qbConfig.consumerKey + ':' + qbConfig.consumerSecret).toString('base64'));

                                        var postBody = {
                                            url: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
                                            headers: {
                                                Accept: 'application/json',
                                                'Content-Type': 'application/x-www-form-urlencoded',
                                                Authorization: 'Basic ' + auth,
                                            },
                                            form: {
                                                grant_type: 'refresh_token',
                                                refresh_token: qbConfig.refresh_token
                                            }
                                        };

                                        request.post(postBody, function (e, r, data) {
                                            var accessToken = JSON.parse(r.body);

                                            qbConfig.access_token = accessToken.access_token;
                                            qbConfig.refresh_token = accessToken.refresh_token;

                                            qbconfigRepo.saveQBConfig(qbConfig, (err, data) => {
                                                if (err) {
                                                    console.log('*** saveQBConfig error: ' + util.inspect(err));
                                                } else {
                                                    console.log('*** QBConfig saved successfully!');
                                                }
                                            });

                                        });
                                    }
                                    else {

                                    }

                                });

                            }
                        }
                    }
                });

            }
        }
    });

});


function getQuickBooksSDK(qbConfig) {

    console.log('*** getQuickBooksSDK');

    if (qbConfig) {
        var qbo = new QuickBooks(qbConfig.consumerKey,
            qbConfig.consumerSecret,
            qbConfig.access_token, /* oAuth access token */
            false, /* no token secret for oAuth 2.0 */
            qbConfig.realmId,
            true, /* use a sandbox account */
            true, /* turn debugging on */
            14, /* minor version */
            '2.0', /* oauth version */
            qbConfig.refresh_token /* refresh token */);

        return qbo;
    }
    else {
        return null;
    }

}

function checkForUnauthorized(req, requestObj, err, response) {

}

module.exports = router;
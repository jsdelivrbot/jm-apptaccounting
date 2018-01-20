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

    var qbConfig = qbconfigRepo.Session_getQBConfig(req.session);
    var QBSDK = qbconfigRepo.getQuickBooksSDK(qbConfig);

    if (QBSDK) {
        QBSDK.findCustomers(function (err, customers) {
            if (err) {
                return res.json({ status: { statusType: "JMA-ST-151", error: util.inspect(err) }, statusCode: 200 });
            }
            else {
                return res.json({
                    status:
                        {
                            statusType: "JMA-ST-1501",
                            error: util.inspect(err),
                            QBOData: customers.QueryResponse.Customer
                        },
                    statusCode: 200
                });
            }
        });
    }
    else {
        return res.json({ status: { statusType: "JMA-ST-151", error: null }, statusCode: 200 });
    }
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
            return res.json({ status: { statusType: "JMA-ST-111", error: util.inspect(err) }, statusCode: 200 });
        } else {
            console.log('*** getUserInfoByEmail ok');
            userInfo = data;

            if (userInfo && userInfo.password === req.body.password) {

                qbconfigRepo.QBSDK_getCompanyInfo(req.session, (status) => {
                    if (status && status.statusType === "JMA-ST-102") { // MongoDB Error                        
                        return res.json({ status: status, statusCode: 200 });
                    }
                    else if (status && status.statusType === "JMA-ST-101") { // Token expired
                        var qbConfig = qbconfigRepo.Session_getQBConfig(req.session);
                        qbconfigRepo.refreshToken(qbConfig, (status) => {
                            if (status && status.statusType === "JMA-ST-103") { // QB Error
                                return res.json({ status: status, statusCode: 200 });
                            }
                            else if (status && status.statusType === "JMA-ST-104") { // MongoDB Error
                                return res.json({ status: status, statusCode: 200 });
                            }
                            else {

                                qbconfigRepo.getQBConfig(req.session, (err, data) => {
                                    if (err) {
                                        return res.json({ status: { statusType: "JMA-ST-162", error: err }, statusCode: 200 });
                                    }
                                    else {
                                        var qbConfig = qbconfigRepo.Session_getQBConfig(req.session);
                                        var QBSDK = qbconfigRepo.getQuickBooksSDK(qbConfig);

                                        QBSDK.getCompanyInfo(qbConfig.realmId, function (err, companyInfo) {

                                            if (err) {
                                                return res.json({ status: { statusType: "JMA-ST-112", error: util.inspect(err) }, statusCode: 200 });
                                            }
                                            else {
                                                qbconfigRepo.Session_saveCompanyInfo(companyInfo);
                                                qbconfigRepo.Session_saveUserInfo(req.session, userInfo);
                                                return res.json({ status: { statusType: "JMA-ST-1002", error: null }, statusCode: 200 });
                                            }

                                        });
                                    }
                                });
                            }
                        });
                    }
                    else {

                        qbconfigRepo.Session_saveCompanyInfo(status.QBOData);
                        qbconfigRepo.Session_saveUserInfo(req.session, userInfo);
                        return res.json({ status: { statusType: "JMA-ST-1002", error: null }, statusCode: 200 });

                    }
                });

            }
            else {
                return res.json({ status: { statusType: "JMA-ST-113", error: null }, statusCode: 200 });
            }
        }
    });

});


module.exports = router;
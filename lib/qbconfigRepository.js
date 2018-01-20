var request = require('request');
var QuickBooks = require('node-quickbooks');

const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    UserInfo = require('../models/userInfo'),
    QBConfig = require('../models/qbconfig');

const util = require('util');

class QBConfigRepository {

    saveUserInfo(body, callback) {
        console.log('*** QBConfigRepository.saveUserInfo');

        let userInfo = new UserInfo();
        userInfo.email = body.email;
        userInfo.password = body.password;

        userInfo.save((err, userInfo) => {
            if (err) {
                console.log(`*** QBConfigRepository saveUserInfo error: ${err}`);
                return callback(err, null);
            }
            callback(null, userInfo);
        });

    }
    saveQBConfig(body, callback) {
        console.log('*** QBConfigRepository.saveQBConfig');

        let qbConfig = new QBConfig();
        qbConfig.consumerKey = body.consumerKey;
        qbConfig.consumerSecret = body.consumerSecret;
        qbConfig.access_token = body.access_token;
        qbConfig.realmId = body.realmId;
        qbConfig.refresh_token = body.refresh_token;
        qbConfig.createdAt = new Date();

        this.deleteQBConfig(qbConfig, (err, data) => {
            if (err) {
                return callback(err, null);
            }
            else {
                qbConfig.save((err, qbConfig) => {
                    if (err) {
                        console.log(`*** QBConfigRepository insertQBConfig error: ${err}`);
                        return callback(err, null);
                    }
                    callback(null, qbConfig);
                });
            }
        });

    }

    deleteQBConfig(body, callback) {
        console.log('*** QBConfigRepository.deleteQBConfig');

        QBConfig.remove({ 'realmId': body.realmId }, (err, qbConfig) => {
            if (err) {
                console.log(`*** QBConfigRepository.deleteQBConfig error: ${err}`);
                return callback(err, null);
            }
            callback(null, qbConfig);
        });
    }

    getQBConfig(session, callback) {
        console.log('*** QBConfigRepository.getQBConfig');

        QBConfig.count((err, qbConfigCount) => {
            let count = qbConfigCount;
            console.log(`QBConfig count: ${count}`);

            QBConfig.find({}, (err, qbConfig) => {
                if (err) {
                    console.log(`*** QBConfigRepository.getQBConfig error: ${err}`);
                    return callback(err);
                }

                if (session && count > 0) this.Session_saveQBConfig(session, qbConfig[0]);

                callback(null, {
                    count: count,
                    qbConfig: qbConfig
                });
            });

        });

    }

    getUserInfoByEmail(email, callback) {
        console.log('*** QBConfigRepository.getUserInfoByEmail');

        UserInfo.findOne({ 'email': email }, (err, userInfo) => {
            if (err) {
                console.log(`*** QBConfigRepository.getUserInfoByEmail error: ${err}`);
                return callback(err);
            }
            callback(null, userInfo);
        });

    }

    Session_saveQBConfig(session, QBConfig) {
        session.QBConfig = QBConfig;
    }
    Session_saveCompanyInfo(session, CompanyInfo) {
        session.CompanyInfo = CompanyInfo;
    }
    Session_getCompanyInfo(session) {
        if (!session.CompanyInfo) return null
        return session.CompanyInfo;
    }
    Session_getQBConfig(session) {
        if (!session.QBConfig) return null
        return session.QBConfig;
    }
    Session_saveUserInfo(session, UserInfo) {
        session.UserInfo = UserInfo;
    }

    refreshToken(qbConfig, callback) {
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

        var $this = this;

        request.post(postBody, function (err, response, data) {
            if (err || response.statusCode != 200) {
                return callback({ statusType: "JMA-ST-103", error: err, statusCode: "JMA-103" });
            }

            var accessToken = JSON.parse(response.body);

            qbConfig.access_token = accessToken.access_token;
            qbConfig.refresh_token = accessToken.refresh_token;

            $this.saveQBConfig(qbConfig, (err, data) => {
                if (err) {
                    console.log('*** saveQBConfig error: ' + util.inspect(err));
                    return callback({ statusType: "JMA-ST-104", error: err, statusCode: "JMA-104" });
                } else {
                    console.log('*** QBConfig saved successfully!');
                    return callback({ statusType: "JMA-ST-1002", error: null, statusCode: "JMA-1002" });
                }
            });
        });
    }

    QBSDK_getCompanyInfo(session, callback) {

        var $this = this;

        $this.getQBConfig(session, (err, data) => {

            if (err) {

                console.log('*** getQuickBooksConfig error: ' + util.inspect(err));
                return callback({ statusType: "JMA-ST-102", error: util.inspect(err), statusCode: "JMA-102" });

            } else {

                console.log('*** getQuickBooksConfig ok');
                if (data.count > 0) {

                    var qbConfig = data.qbConfig[0];
                    var QBSDK = $this.getQuickBooksSDK(qbConfig);

                    if (QBSDK) {

                        QBSDK.getCompanyInfo(qbConfig.realmId, function (err, companyInfo) {

                            if (err) {
                                return callback({ statusType: "JMA-ST-101", error: err, statusCode: "JMA-101" });
                            }
                            else {
                                return callback({ statusType: "JMA-ST-1001", error: null, QBOData: companyInfo, statusCode: "JMA-1001" });
                            }

                        });

                    }
                    else {
                        return callback({ statusType: "JMA-ST-102", error: "QBSDK is empty.", statusCode: "JMA-102" });
                    }
                }
                else {
                    return callback({ statusType: "JMA-ST-102", error: "Company info not found.", statusCode: "JMA-102" });
                }
            }
        });
    }

    getQuickBooksSDK(qbConfig) {

        console.log('*** getQuickBooksSDK');

        if (qbConfig) {
            var qbo = new QuickBooks(qbConfig.consumerKey,
                qbConfig.consumerSecret,
                qbConfig.access_token, /* oAuth access token */
                false, /* no token secret for oAuth 2.0 */
                qbConfig.realmId,
                false, /* use a sandbox account */
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
}

module.exports = new QBConfigRepository();
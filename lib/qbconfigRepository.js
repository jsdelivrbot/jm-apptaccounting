const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    UserInfo = require('../models/userInfo'),
    QBConfig = require('../models/qbconfig');

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

    getQBConfig(callback) {
        console.log('*** QBConfigRepository.getQBConfig');

        QBConfig.count((err, qbConfigCount) => {
            let count = qbConfigCount;
            console.log(`QBConfig count: ${count}`);

            QBConfig.find({}, (err, qbConfig) => {
                if (err) {
                    console.log(`*** QBConfigRepository.getQBConfig error: ${err}`);
                    return callback(err);
                }
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
}

module.exports = new QBConfigRepository();
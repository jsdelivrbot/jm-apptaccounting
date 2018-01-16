var request = require('request');
var express = require('express');
var router = express.Router();
var QuickBooks = require('node-quickbooks');

const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
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

function getQuickBooksConfig() {

    console.log('*** getQuickBooksConfig');

    let qbConfig = new QBConfig();

    qbconfigRepo.getQBConfig((err, data) => {
        if (err) {
            console.log('*** getQuickBooksConfig error: ' + util.inspect(err));
            qbConfig = null;
        } else {
            console.log('*** getQuickBooksConfig ok');
            qbConfig = data.qbConfig;
        }
    });

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
    }
    else {
        return null;
    }

}

module.exports = router;
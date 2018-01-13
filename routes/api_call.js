var request = require('request');
var express = require('express');
var router = express.Router();

/** /api_call **/
router.get('/Tenants', function (req, res) {
    console.log("API: Tenants");
    console.log(global.QuickBooksConfig);
    if (global.QuickBooksConfig != undefined && global.QuickBooksConfig != null) {
        global.QuickBooksConfig.findCustomers(function (_, customers) {
            global.Customers = customers.QueryResponse.Customer;
            return res.json({ customers: customers.QueryResponse.Customer, statusCode: 200 });
        });
    }    
});

module.exports = router;
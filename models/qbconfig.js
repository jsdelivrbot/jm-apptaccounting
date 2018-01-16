const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

const QBConfigSchema = new Schema({
    consumerKey: { type: String, required: true, trim: true },
    consumerSecret: { type: String, required: true, trim: true },
    access_token: { type: String, required: true, trim: true },
    realmId: { type: String, required: true, trim: true },
    refresh_token: { type: String, required: true, trim: true },
    createdAt: { type: Date, required: true, trim: true }
});

module.exports = mongoose.model('QBConfig', QBConfigSchema);
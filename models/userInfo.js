const mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

const UserInfoSchema = new Schema({
    email: { type: String, required: true, trim: true },
    password: { type: String, required: true, trim: true }
});

module.exports = mongoose.model('UserInfo', UserInfoSchema);
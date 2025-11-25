const mongoose = require('mongoose');

const dailyMoneySchema = new mongoose.Schema({
    Date: {
        type: String,
    },

    sortDate: {
        type: Date,
        default: Date.now()
    },

    purchase: {
        type: Array,
        default: []
    },

    total: {
        type: Number,
        default: 0
    },

    isCashier: {
        type: Boolean,
    }
})

const DailyMoney = mongoose.model('DailyMoney', dailyMoneySchema, 'DailyMoney')
module.exports = DailyMoney
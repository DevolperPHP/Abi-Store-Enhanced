const mongoose = require('mongoose');

const sellSchema = new mongoose.Schema({
    user: {
        type: String
    },

    name: {
        type: String,
    },

    products: {
        type: Array
    },

    phone: {
        type: String
    },

    note: {
        type: String,
    },

    status: {
        type: String,
    },

    adress: {
        type: String
    },

    total: {
        type: String,
    },

    bid: {
        type: String
    },

    Date: {
        type: String
    },

    userId:{
        type: String
    },

    isShop: {
        type: Boolean,
    },

    isCashier: {
        type: Boolean,
    },
    sortDate: {
        type: Date,
        default: Date.now()
    }
})

const Sell = mongoose.model('Sell', sellSchema)
module.exports = Sell
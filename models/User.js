const mongoose = require('mongoose')

const uesrSchema = new mongoose.Schema({
    name:{
        type: String
    },

    email: {
        type: String
    },

    password: {
        type: String
    },

    cart: {
        type: Array
    },

    purchase: {
        type: Array,
        default: [],
    },

    permissions: {
        type: Array
    },

    isAdmin: {
        type: Boolean,
        default: false
    },

    shop_cart: {
        type: Array
    },

    fav: {
        type: Array
    },

    purchased: {
        type: Array
    },

    city: {
        type: String
    },

    phone: {
        type: String
    },

    localstoreCart: {
        type: Array,
    },

    transfer: {
        type: Array,
    }
})

const User = mongoose.model("User", uesrSchema)
module.exports = User
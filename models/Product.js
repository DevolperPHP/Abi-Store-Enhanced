const mongoose = require('mongoose')

const productSchema = new mongoose.Schema({
    name: {
        type: String,
    },

    price: {
        type: Number
    },

    qty: {
        type: Number,
    },

    stock: {
        type: Number,
        default: null,
    },

    barcode: {
        type: String,
    },

    Date: {
        type: String,
    },

    score: {
        type: Array,
        default : [],
    },

    image: {
        type: String,
    },

    color: {
        type: String,
    },

    size:{
        type: String
    },

    sell_price: {
        type: Number,
    },

    sizes:{
        type: Array,
        default : [],
    },

    purchase:{
        type: Array,
        default : [],
    },

    colors:{
        type: Array,
        default : [],
    },

    colorName:{
        type: String,
    },

    saleDate:{
        type: Array,
        default : []
    },

    category:{
        type: String,
    },

    brand: {
        type: String,
    },

    des: {
        type: String
    },

    comments: {
        type: Array,
    }
})

const Product = mongoose.model("Product", productSchema)
module.exports = Product
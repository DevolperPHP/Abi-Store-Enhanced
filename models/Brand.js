const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
    name: {
        type: String,
    },

    Date: {
        type: String,
    },

    image: {
        type: String,
    }
})

const Brand  = mongoose.model('Brand', brandSchema, 'Brand')
module.exports = Brand
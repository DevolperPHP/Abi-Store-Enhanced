const mongoose = require('mongoose');

const colorsSchema = new mongoose.Schema({
    hex: {
        type: String,  
    }
})

const Color = mongoose.model("Colors", colorsSchema);

module.exports = Color
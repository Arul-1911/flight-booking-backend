const mongoose = require('mongoose');

const flightSchema = new mongoose.Schema({
    departure:String,
    arrival: String,
    departure_time: String,
    arrival_time: String,
    class: String,
    price: Number,
    plane_name: String

});


const Flight = mongoose.model('Flight', flightSchema);

module.exports = Flight;
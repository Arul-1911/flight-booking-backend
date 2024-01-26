const mongoose = require("mongoose");

const passengerSchema = new mongoose.Schema({
  adults: {
    type: Number,
    required: true,
  },
  children: {
    type: Number,
    required: true,
  },
  mainPassenger: {
    name: {
      type: String,
      required: true,
    },
    age: {
      type: Number,
      required: true,
    },
    gender: {
      type: String,
      required: true,
    },
    luggage: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: Number,
      required: true,
    },
  },
  adultDetails: [
    {
      name: {
        type: String,
        // required: true,
      },
      gender: {
        type: String,
        // required: true,
      },
    },
  ],
  childDetails: [
    {
      name: {
        type: String,
        // required: true,
      },
      gender: {
        type: String,
        // required: true,
      },
    },
  ],
  flightName: {
    type: String,
    required: true,
  },
  flightClass: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
});

const Passenger = mongoose.model("Passenger", passengerSchema);

module.exports = Passenger;

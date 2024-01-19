const mongoose = require('mongoose');
const Flight = require('../models/flight'); //getting schema


const flightData = {
    flights:[
        {
        "departure": "madurai",
      "arrival": "coimbatore",
      "departure_time": "08:00 AM",
      "arrival_time": "9:30 AM",
      "class": "Business",
      "price": 500.00,
      "plane_name": "Airbus A320"
    },
    {
        "departure": "madurai",
      "arrival": "coimbatore",
      "departure_time": "10:00 AM",
      "arrival_time": "11:30 AM",
      "class": "Economy",
      "price": 200.00,
      "plane_name": "Airbus A320"
    },
    {
        "departure": "madurai",
        "arrival": "coimbatore",
        "departure_time": "12:00 PM",
        "arrival_time": "01:30 PM",
        "class": "Business",
        "price": 600.00,
        "plane_name": "Boeing B737"   
      },
    
    {
      "departure": "madurai",
      "arrival": "coimbatore",
      "departure_time": "10:00 PM",
      "arrival_time": "12:30 AM",
      "class": "Economy",
      "price": 300.00,
      "plane_name": "Boeing B737"   
    },
    {
      "departure": "madurai",
      "arrival": "coimbatore",
      "departure_time": "12:00 PM",
      "arrival_time": "01:30 PM",
      "class": "Economy",
      "price": 200.00,
      "plane_name": "Indigo B737"   
    },
    {
        "departure": "madurai",
        "arrival": "coimbatore",
        "departure_time": "09:00 PM",
        "arrival_time": "11:30 PM",
        "class": "Business",
        "price": 700.00,
        "plane_name": "Indigo B737"   
      }
]
};

//saving data to the database

const seedDatabase = async () => {
    try {
        for (const flightInfo of flightData.flights) {
            // Check if the flight already exists in the database
            const existingFlight = await Flight.findOne(flightInfo);

            if (!existingFlight) {
                const flight = new Flight(flightInfo);
                await flight.save();
                console.log(`Flight added: ${JSON.stringify(flightInfo)}`);
            } else {
                console.log(`Flight already exists: ${JSON.stringify(flightInfo)}`);
            }
        }
        console.log('Database flight details added successfully');
    } catch (error) {
        console.error('Error in adding flight data', error);
    }
}


// seedDatabase();
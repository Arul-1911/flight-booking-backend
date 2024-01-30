// Import necessary modules and packages
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const bcrypt = require("bcrypt");
const resetEmailRoutes = require("./routes/resetEmail");
const seedDatabase = require("./scripts/flightData");
const Passenger = require("./models/passenger");
const Razorpay = require("razorpay");
const crypto = require('crypto');
const pdfkit = require('pdfkit');


// Import routes and models
const authRoutes = require("./routes/auth");
const User = require("./models/users");
const Flight = require("./models/flight");
const Feedback = require('./models/feedback');

// Create an Express application
const app = express();
const port = 5000;

// Apply middlewares
app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
const connection = async () => {
  try {
    await mongoose.connect(process.env.DB);
    console.log("DB Connected");
    // seedDatabase();   //connecting the flightdetails schema
  } catch (error) {
    console.error("Error in connecting to the database:", error);
  }
};

connection();

// Authentication middleware
const authentication = async (req, res, next) => {
  const tokenHeader = req.header("Authorization");
  console.log("Token in middleware:", tokenHeader);

  if (!tokenHeader) {
    return res.status(401).json("Access denied. Token is missing");
  }

  const [bearer, token] = tokenHeader.split(" ");

  if (bearer !== "Bearer" || !token) {
    return res.status(401).json("Invalid token format");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded Token:", decoded);

    // Attach user information directly to the request object
    req.userInfo = {
      userId: decoded.userId,
      email: decoded.email,
    };

    next();
  } catch (error) {
    console.error("Error in authentication middleware:", error);
    return res.status(403).json("Invalid token.");
  }
};

// Use authentication middleware for protected routes
app.use("/auth", authRoutes);
app.use("/resetemail", resetEmailRoutes); //reseting email link

// Password reset route
app.post("/auth/reset-password", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json("User not found");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    console.log(hashedPassword);

    // Use updateOne with $set
    await User.updateOne({ email }, { $set: { password: hashedPassword } });

    res.json("Password reset successfully");
  } catch (error) {
    console.error("Error in password reset:", error);
    res.status(500).json("Password reset server error");
  }
});

// route for fetching flight data
app.get("/flights", async (req, res) => {
  try {
    const { departure, arrival, flightClass } = req.query;

    const filter = {};
    if (departure) filter.departure = new RegExp(departure.trim(), "i");
    if (arrival) filter.arrival = new RegExp(arrival.trim(), "i");
    if (flightClass) filter.class = new RegExp(flightClass.trim(), "i");

    const flights = await Flight.find(filter);
    res.json(flights);
  } catch (error) {
    console.error("Error in fetching flight data:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route for submitting passenger details
app.post("/api/submitTravelDetails", authentication, async (req, res) => {
  try {
    console.log("User ID from middleware:", req.userInfo.userId);
    console.log("Request Body:", req.body);

    const {
      mainPassenger,
      additionalPassengers,
      adultss,
      childrens,
      flightName,
      price,
      flightClass,
      flightId,
      date,
    } = req.body;

    const totalPassengers = adultss + childrens;
    const totalPrice = totalPassengers * price;

    const passengers = [
      {
        name: mainPassenger.name,
        gender: mainPassenger.gender,
        isChild: false,
      },
      ...additionalPassengers.Adult.map((adult) => ({
        name: adult.name,
        gender: adult.gender,
        isChild: false,
      })),
      ...(childrens > 0
        ? additionalPassengers.Child.map((child) => ({
            name: child.name,
            gender: child.gender,
            isChild: true,
          }))
        : []), // Use an empty array if there are no child passengers
    ];

    const passenger = new Passenger({
      adults: adultss,
      children: childrens,
      passengers,
      mainPassenger: {
        name: mainPassenger.name,
        age: mainPassenger.age,
        gender: mainPassenger.gender,
        luggage: mainPassenger.luggage,
        phoneNumber: mainPassenger.phoneNumber,
      },
      flightName,
      flightClass,
      price: totalPrice,
      flightId,
      date,
      userId: req.userInfo.userId,
    });

    console.log("Passenger Object before Save:", passenger);
    console.log("FlightId before Save:", flightId);

    await passenger.save();

    res.json({ message: "Passenger details submitted successfully" });
  } catch (error) {
    console.error("Error submitting passenger details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// Add a new route to retrieve the total amount from the database
app.post("/api/getTotalAmount", authentication, async (req, res) => {
  try {
    const { userId } = req.userInfo;
    const latestPassenger = await Passenger.findOne({ userId }).sort({ _id: -1 });

    if (!latestPassenger) {
      return res.status(404).json({ error: "Passenger details not found" });
    }

    const { price: totalPrice } = latestPassenger;
    res.json({ totalPrice });
  } catch (error) {
    console.error("Error fetching total amount:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Razorpay instance payment route
app.post("/order", async (req, res) => {
  try {
    const razorpay = new Razorpay({
      key_id: process.env.YOUR_KEY_ID,
      key_secret: process.env.YOUR_KEY_SECRET,
    });

    const options = req.body;
    const order = await razorpay.orders.create(options);

    if (!order) {
      return res.status(500).send("error in order");
    }

    res.send(order);
  } catch (error) {
    console.log(error);
    res.status(500).send("error");
  }
});

// Razorpay validation
app.post('/order/validate', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const sha = crypto.createHmac("sha256", process.env.YOUR_KEY_SECRET);
    sha.update(`${razorpay_order_id}|${razorpay_payment_id}`);

    const digest = sha.digest("hex");
    if (digest !== razorpay_signature) {
      return res.status(400).json({ message: "Transaction is not legit!" });
    }

    res.json({
      message: "payment success",
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });
  } catch (error) {
    console.log(error);
  }
});

// Add this function before the endpoint definitions
function formatDate(date) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(date).toLocaleDateString('en-US', options);
}

// Function to generate kiwi-style ticket for multiple passengers in a single PDF
function generateKiwiTicket(passengers, flightDetails, date) {
  const doc = new pdfkit();

  doc.font('Helvetica-Bold');
  doc.fontSize(18);
  doc.fillColor('#0dcbb2'); // kiwi's color
  

  passengers.slice(1).forEach((passenger, index) => {
    if (index > 0) {
      doc.addPage(); 
    }
    doc.fillColor('#0dcbb2'); // kiwi's color
    doc.text('Kiwi.com', { align: 'center' });

     // Add Departure and Arrival places
    doc.moveDown();
    doc.fontSize(12);
    doc.text(`Departure: ${flightDetails.departure || 'N/A'}`, { align: 'center' });
    doc.text(`Arrival: ${flightDetails.arrival || 'N/A'}`, { align: 'center' });

    doc.moveDown();
    doc.fontSize(12);
    doc.fillColor('#000'); // Black color
    doc.text(`Flight: ${flightDetails.plane_name || 'N/A'}`);
    doc.text(`Departure Time: ${flightDetails.departure_time || 'N/A'}`);
    doc.text(`Arrival Time: ${flightDetails.arrival_time || 'N/A'}`);
    doc.text(`Date: ${formatDate(date)}`);

    doc.moveDown();
    doc.fontSize(14);
    doc.text(`Passenger Details:`, { align: 'center' });
    
    doc.text(`Name: ${passenger.name}`);
    doc.text(`Gender: ${passenger.gender}`);

    doc.moveDown();
    doc.text('BOARDING PASS', { align: 'center' });
    doc.text(`Seat: ${generateRandomSeatNumber()}`);
    doc.text(`Gate: ${generateRandomGateNumber()}`);
    doc.text(`Group: ${generateRandomBoardingGroup()}`);
  });

  return doc; // Return the PDF document
}

// Endpoint for generating kiwi-style ticket for all passengers in a single PDF
app.post("/api/generateTicket", authentication, async (req, res) => {
  try {
    const userId = req.userInfo.userId;
    console.log("User ID:", userId);

    const latestPassenger = await Passenger.findOne({ userId }).sort({ _id: -1 });
    console.log("Latest Passenger:", latestPassenger);

    if (!latestPassenger) {
      return res.status(404).json({ error: "Passenger details not found" });
    }

    const { passengers, flightId, date } = latestPassenger;
    console.log("Flight ID:", flightId);

    const flightDetails = await Flight.findById(flightId);
    console.log("Flight Details:", flightDetails);

    if (!flightDetails) {
      return res.status(404).json({ error: "Flight details not found" });
    }

    // Generate kiwi-style PDF ticket for all passengers
    const pdfDoc = generateKiwiTicket(passengers, flightDetails, date);

    // Serve the generated PDF file to the client
    res.setHeader('Content-Type', 'application/pdf');
    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (error) {
    console.error("Error generating kiwi-style ticket:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});





// API endpoint to handle feedback submission
app.post('/api/submitFeedback', async (req, res) => {
  try {
    const { name, feedback } = req.body;
    const newFeedback = new Feedback({ name, feedback });
    await newFeedback.save();
    res.status(200).json({ success: true, message: 'Feedback submitted successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Helper functions
function generateRandomSeatNumber() {
  return Math.floor(Math.random() * 100) + 1;
}

function generateRandomGateNumber() {
  return Math.floor(Math.random() * 20) + 1;
}

function generateRandomBoardingGroup() {
  const groups = ['A', 'B', 'C', 'D', 'E'];
  const randomIndex = Math.floor(Math.random() * groups.length);
  return groups[randomIndex];
}

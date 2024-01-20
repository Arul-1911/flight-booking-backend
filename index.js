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
const stripe = require("stripe")(
  "sk_test_51OaYUrSFekStM1Bar7vlypn7z1Ma7vrbl7TqlEMLAlYa5fDuMmrgH3hp8BBbsNRbl5wEMfyc5lTAEYiQlNFkMmMS00urw493J7"
);

// Import routes and models
const authRoutes = require("./routes/auth");
const User = require("./models/users");
const Flight = require("./models/flight");

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

// authentication();

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

    // const newPassword = String(incomingPassword);
    // const salt = await bcrypt.genSalt(10);
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

//route for fetching flight data
app.get("/flights", async (req, res) => {
  try {
    const { departure, arrival, flightClass } = req.query;

    const filter = {};
    if (departure) filter.departure = new RegExp(departure.trim(), "i"); //trim the whitespace in departure
    if (arrival) filter.arrival = new RegExp(arrival.trim(), "i"); //trim the whitespace in arrival
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
  const { adults, children, mainPassenger, flightName, price, date } = req.body;

  try {
    console.log("User ID from middleware:", req.userInfo.userId);

    const passenger = new Passenger({
      adults,
      children,
      mainPassenger,
      flightName,
      price,
      date,
      userId: req.userInfo.userId,
    });

    await passenger.save();

    res.json({ message: "Passenger details submitted successfully" });
  } catch (error) {
    console.error("Error submitting passenger details:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


//payment route
app.post("/create-payment-intent", authentication, async (req, res) => {
  const { amount, currency } = req.body;

  try {
    // Create a payment intent using the Stripe API
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
    });

    // Respond with the client secret of the payment intent
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error("Error creating payment intent:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

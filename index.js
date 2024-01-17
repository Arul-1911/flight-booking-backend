// Import necessary modules and packages
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const bcrypt = require("bcrypt");
const resetEmailRoutes = require('./routes/resetEmail'); 

// Import routes and models
const authRoutes = require("./routes/auth");
const User = require("./models/users");

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

  const [bearer, token] = tokenHeader.split(' ');

  if (bearer !== 'Bearer' || !token) {
    return res.status(401).json("Invalid token format");
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded Token:", decoded);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Error in authentication middleware:", error);
    return res.status(403).json("Invalid token.");
  }
};
// authentication();


// Use authentication middleware for protected routes
app.use("/auth", authRoutes);
app.use("/resetemail",resetEmailRoutes );//reseting email link

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

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

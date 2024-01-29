const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/users");

router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    // Check if a user with the same email exists
    const existingUserByEmail = await User.findOne({ email });
    if (existingUserByEmail) {
      return res.status(400).json({ message: 'Email already exists.' });
    }

    // Check if a user with the same name exists
    const existingUserByName = await User.findOne({ name });
    if (existingUserByName) {
      return res.status(400).json({ message: 'Username already exists. Please choose a different username.',field: 'name' });
    }

    // Hashing password before storing in the database
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();
    res.json({ message: 'User added successfully.' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'An error occurred during signup. Please try again later.' });
  }
});

router.post("/signin", async (req, res) => {
  const { email, password } = req.body;
 // validating the email password in db
  try {
    const user = await User.findOne({ email });
   
    if (!user) {
      return res.status(404).json("user not found");
    }
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json("Invalid Password");
    }

    //generate jwt token

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );
    res.json({ token, userId: user._id });
  } catch (error) {
    res.status(500).json(`Error: ${error}`);
  }
});


module.exports = router;

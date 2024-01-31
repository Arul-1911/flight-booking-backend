const nodemailer = require("nodemailer");
const crypto = require("crypto");
const User = require("../models/users");

const emailConfig = {
  service: "gmail",
  auth: {
    user: "learningsformyself123@gmail.com",
    pass: "cahqamxwtjgurbca",
  },
};

const transporter = nodemailer.createTransport(emailConfig); // sender email configuration

const resetEmailController = {
  sendResetLink: async (req, res) => {
    const { email } = req.body;
    try {
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ error: "Email not found" });
      }
      const token = crypto.randomBytes(20).toString("hex"); // sending link characters
      user.resetToken = token;
      user.resetTokenExpiration = Date.now() + 3600000 // token valid for 1 hour
      await user.save(); 

      const mailoptions = {
        from:"learningsformyself123@gmail.com",
        to:email,
        subject:"Password Reset Link",
        text:`Click the following link to reset your password: https://kiwi-flight-booking.vercel.app/resetpassword/${token}`,
      }

      await transporter.sendMail(mailoptions); // sending password reset link to the reqsted mailid

      res.json({message:"Reset link sent succesfully"})
    } catch (error) {
        console.error("Error sending reset link email", error);
      res.status(500).json({ error: "Failed to send reset link" });
    }
  },
};

module.exports = resetEmailController;
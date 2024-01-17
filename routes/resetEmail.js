const express = require('express');
const router = express.Router();
const resetEmailController = require('../controllers/resetEmail');

router.post('/send-reset-link', resetEmailController.sendResetLink);

module.exports = router;
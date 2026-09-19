const express = require('express');

const {
    showLogin,
    login,
    logout
} = require('../controllers/authController');

const router = express.Router();

router.get('/login', showLogin);

router.post('/login', login);

router.post('/logout', logout);

module.exports = router;
const express = require('express');

const {
    requireRole
} = require('../middleware/auth');

const {
    index
} = require('../controllers/reportController');

const router = express.Router();

router.get(
    '/admin/reports',
    requireRole('Admin'),
    index
);

module.exports = router;

const express = require('express');

const {
    requireAnyRole
} = require('../middleware/auth');

const {
    index,
    newHaircut,
    createHaircut,
    invoice
} = require('../controllers/barberController');

const router = express.Router();


// =========================
// Barber Dashboard
// =========================

router.get(
    '/barber',
    requireAnyRole('Admin', 'Barber'),
    index
);


// =========================
// New Haircut
// Admin + Barber
// =========================

router.get(
    '/barber/new-haircut',
    requireAnyRole('Admin', 'Barber'),
    newHaircut
);

router.post(
    '/barber/new-haircut',
    requireAnyRole('Admin', 'Barber'),
    createHaircut
);


// =========================
// Invoice
// Admin + Barber
// =========================

router.get(
    '/barber/invoice/:id',
    requireAnyRole('Admin', 'Barber'),
    invoice
);


module.exports = router;
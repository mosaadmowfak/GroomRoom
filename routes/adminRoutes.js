const express = require('express');

const {
    requireRole
} = require('../middleware/auth');

const {
    index,
    businessDay,
    openBusinessDay,
    closeBusinessDay,
    invoices,
    invoiceDetails
} = require('../controllers/adminController');

const {
    index: barbers,
    createPage: createBarberPage,
    create: createBarber,
    editPage: editBarberPage,
    update: updateBarber,
    toggle: toggleBarber,
    addBonus: addBarberBonus,
    addPenalty: addBarberPenalty,
    addAdvance: addBarberAdvance
} = require('../controllers/barberAdminController');

const {
    index: services,
    createPage: createServicePage,
    create: createService,
    editPage: editServicePage,
    update: updateService,
    toggle: toggleService
} = require('../controllers/serviceAdminController');

const {
    index: payroll,
    addBonus,
    addPenalty,
    addAdvance
} = require('../controllers/payrollController');

const {
    index: expenses,
    addExpense
} = require('../controllers/expenseController');

const {
    index: advances,
    addAdvance: addAdvancePage
} = require('../controllers/advanceController');

const router = express.Router();


/*
==================================================
ADMIN DASHBOARD
==================================================
*/

router.get(
    '/admin',
    requireRole('Admin'),
    index
);


/*
==================================================
BUSINESS DAY
==================================================
*/

router.get(
    '/admin/business-day',
    requireRole('Admin'),
    businessDay
);

router.post(
    '/admin/business-day/open',
    requireRole('Admin'),
    openBusinessDay
);

router.post(
    '/admin/business-day/close',
    requireRole('Admin'),
    closeBusinessDay
);


/*
==================================================
BARBERS
==================================================
*/

router.get(
    '/admin/barbers',
    requireRole('Admin'),
    barbers
);

router.get(
    '/admin/barbers/create',
    requireRole('Admin'),
    createBarberPage
);

router.post(
    '/admin/barbers/create',
    requireRole('Admin'),
    createBarber
);

router.get(
    '/admin/barbers/edit/:id',
    requireRole('Admin'),
    editBarberPage
);

router.post(
    '/admin/barbers/edit/:id',
    requireRole('Admin'),
    updateBarber
);

router.post(
    '/admin/barbers/toggle/:id',
    requireRole('Admin'),
    toggleBarber
);

router.post(
    '/admin/barbers/:id/bonus',
    requireRole('Admin'),
    addBarberBonus
);

router.post(
    '/admin/barbers/:id/penalty',
    requireRole('Admin'),
    addBarberPenalty
);

router.post(
    '/admin/barbers/:id/advance',
    requireRole('Admin'),
    addBarberAdvance
);


/*
==================================================
SERVICES
==================================================
*/

router.get(
    '/admin/services',
    requireRole('Admin'),
    services
);

router.get(
    '/admin/services/create',
    requireRole('Admin'),
    createServicePage
);

router.post(
    '/admin/services/create',
    requireRole('Admin'),
    createService
);

router.get(
    '/admin/services/edit/:id',
    requireRole('Admin'),
    editServicePage
);

router.post(
    '/admin/services/edit/:id',
    requireRole('Admin'),
    updateService
);

router.post(
    '/admin/services/toggle/:id',
    requireRole('Admin'),
    toggleService
);


/*
==================================================
INVOICES
==================================================
*/

router.get(
    '/admin/invoices',
    requireRole('Admin'),
    invoices
);

router.get(
    '/admin/invoices/:id',
    requireRole('Admin'),
    invoiceDetails
);


/*
==================================================
PAYROLL
==================================================
*/

router.get(
    '/admin/payroll',
    requireRole('Admin'),
    payroll
);

router.post(
    '/admin/payroll/bonus',
    requireRole('Admin'),
    addBonus
);

router.post(
    '/admin/payroll/penalty',
    requireRole('Admin'),
    addPenalty
);

router.post(
    '/admin/payroll/advance',
    requireRole('Admin'),
    addAdvance
);


/*
==================================================
EXPENSES
==================================================
*/

router.get(
    '/admin/expenses',
    requireRole('Admin'),
    expenses
);

router.post(
    '/admin/expenses/add',
    requireRole('Admin'),
    addExpense
);


/*
==================================================
ADVANCES
==================================================
*/

router.get(
    '/admin/advances',
    requireRole('Admin'),
    advances
);

router.post(
    '/admin/advances/add',
    requireRole('Admin'),
    addAdvancePage
);


module.exports = router;
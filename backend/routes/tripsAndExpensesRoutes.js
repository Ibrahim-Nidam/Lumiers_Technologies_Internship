const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { exportTripsAndExpenses, importTripsAndExpenses } = require('../controllers/tripsAndExpensesController');

router.get('/export', authMiddleware, exportTripsAndExpenses);
router.post('/import', authMiddleware, importTripsAndExpenses);

module.exports = router;
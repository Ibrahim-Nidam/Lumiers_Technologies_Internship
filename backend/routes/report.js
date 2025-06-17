const router = require('express').Router();
const { exportExcel, exportPDF, getUserAggregates, generateMonthlyRecap } = require('../controllers/reportController');

router.get('/excel', exportExcel);
router.get('/pdf', exportPDF);
router.get("/summary", getUserAggregates);
router.get('/monthly-recap', generateMonthlyRecap);

module.exports = router;
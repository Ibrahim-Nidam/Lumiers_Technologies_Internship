const router = require('express').Router();
const { exportExcel, exportPDF, getUserAggregates, generateMonthlyRecap, generateTripTablesZip } = require('../controllers/reportController');

router.get('/excel', exportExcel);
router.get('/pdf', exportPDF);
router.get("/summary", getUserAggregates);
router.get('/monthly-recap', generateMonthlyRecap);
router.get('/trip-tables-zip', generateTripTablesZip);

module.exports = router;
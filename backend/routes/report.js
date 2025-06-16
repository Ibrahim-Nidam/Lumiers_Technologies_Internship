const router = require('express').Router();
const { exportExcel, exportPDF, getUserAggregates } = require('../controllers/reportController');

router.get('/excel', exportExcel);
router.get('/pdf', exportPDF);
router.get("/summary", getUserAggregates);

module.exports = router;
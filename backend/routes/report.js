const router = require('express').Router();
const { exportExcel, exportPDF, getUserAggregates } = require('../controllers/reportController');

router.get('/excel', exportExcel);
router.get('/pdf', exportPDF);
// router.get("/user-aggregates", getUserAggregates);

module.exports = router;
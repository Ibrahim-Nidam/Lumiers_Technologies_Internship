const router = require('express').Router();
const { exportExcel, exportPDF } = require('../controllers/reportController');

router.get('/excel', exportExcel);
router.get('/pdf', exportPDF);
router.get("/user-aggregates", reportController.getUserAggregates);

module.exports = router;
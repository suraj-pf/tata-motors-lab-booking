const express = require('express');
const { 
  getAllLabs, 
  getLabById,
  getLabAvailability, 
  getBuildings 
} = require('../controllers/labController');
const router = express.Router();

router.get('/', getAllLabs);
router.get('/buildings', getBuildings);
router.get('/availability', getLabAvailability);
router.get('/:labId', getLabById);

module.exports = router;
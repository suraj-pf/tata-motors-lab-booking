const { pool } = require('../shared/config/database');
const { analyticsService } = require('../shared/services/analyticsService');

const getLabUtilization = async (req, res) => {
  try {
    const { start_date, end_date, bc_number, building } = req.query;
    const analytics = await analyticsService.getLabUtilization({ 
      start_date, end_date, bc_number, building 
    });
    res.json({ success: true, analytics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getTopLabs = async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    const topLabs = await analyticsService.getTopLabs(period);
    res.json({ success: true, topLabs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { getLabUtilization, getTopLabs };

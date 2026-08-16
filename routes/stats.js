const express = require('express');
const router = express.Router();
const { getDb } = require('../database/db');

// GET /api/stats/dashboard - High-level metrics for dashboard
router.get('/dashboard', (req, res) => {
  try {
    const db = getDb();

    // 1. Total active students
    const studentCount = db.prepare("SELECT COUNT(*) as count FROM students WHERE status = 'Active'").get().count;

    // 2. Total colleges
    const collegeCount = db.prepare('SELECT COUNT(DISTINCT college) as count FROM students').get().count;

    // 3. Campaign summary
    const campaignStats = db.prepare(`
      SELECT 
        COUNT(*) as total_campaigns,
        COALESCE(SUM(total_recipients), 0) as total_targeted,
        COALESCE(SUM(sent_count), 0) as total_sent,
        COALESCE(SUM(success_count), 0) as total_success,
        COALESCE(SUM(failed_count), 0) as total_failed
      FROM campaigns
    `).get();

    const overallSuccessRate = campaignStats.total_sent > 0
      ? Math.round((campaignStats.total_success / campaignStats.total_sent) * 100)
      : 100;

    // 4. College distribution (Top 8)
    const collegeDistribution = db.prepare(`
      SELECT college, COUNT(*) as student_count
      FROM students
      GROUP BY college
      ORDER BY student_count DESC
      LIMIT 8
    `).all();

    // 5. Batch breakdown
    const batchBreakdown = db.prepare(`
      SELECT batch, COUNT(*) as count
      FROM students
      WHERE batch IS NOT NULL AND batch != ''
      GROUP BY batch
      ORDER BY batch DESC
    `).all();

    // 6. Recent campaigns (Last 5)
    const recentCampaigns = db.prepare(`
      SELECT id, title, subject, total_recipients, sent_count, success_count, failed_count, status, started_at, completed_at, created_at
      FROM campaigns
      ORDER BY id DESC
      LIMIT 5
    `).all();

    // 7. Recent delivery logs (Last 8)
    const recentDeliveries = db.prepare(`
      SELECT cr.*, c.title as campaign_title
      FROM campaign_recipients cr
      LEFT JOIN campaigns c ON cr.campaign_id = c.id
      WHERE cr.status IN ('sent', 'failed')
      ORDER BY cr.id DESC
      LIMIT 8
    `).all();

    res.json({
      success: true,
      stats: {
        totalStudents: studentCount,
        totalColleges: collegeCount,
        totalCampaigns: campaignStats.total_campaigns,
        totalEmailsSent: campaignStats.total_sent,
        totalSuccess: campaignStats.total_success,
        totalFailed: campaignStats.total_failed,
        successRate: overallSuccessRate,
        collegeDistribution,
        batchBreakdown,
        recentCampaigns,
        recentDeliveries
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

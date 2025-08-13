const express = require('express');
const WebhookManager = require('./webhook');

// Create Express app for webhook API endpoints
const app = express();
app.use(express.json());

const webhook = new WebhookManager(process.env.DISCORD_WEBHOOK_URL);

// Endpoint for hub script to log key usage attempts
app.post('/log-key-usage', async (req, res) => {
  try {
    const { key, userId, hwid, ip, success, reason } = req.body;
    
    if (!key) {
      return res.status(400).json({ error: 'Key is required' });
    }
    
    await webhook.logScriptUsage({
      key,
      userId: userId || 'Unknown',
      hwid: hwid || null,
      ip: ip || 'Unknown',
      success: success !== false, // Default to true if not specified
      reason: reason || (success !== false ? 'Authentication successful' : 'Authentication failed')
    });
    
    res.json({ success: true, message: 'Usage logged to webhook' });
  } catch (error) {
    console.error('Failed to log key usage:', error.message);
    res.status(500).json({ error: 'Failed to log usage' });
  }
});

// Endpoint for system status updates
app.post('/system-status', async (req, res) => {
  try {
    const statusData = req.body;
    await webhook.sendSystemStatus(statusData);
    res.json({ success: true, message: 'System status sent to webhook' });
  } catch (error) {
    console.error('Failed to send system status:', error.message);
    res.status(500).json({ error: 'Failed to send system status' });
  }
});

// Endpoint to manually trigger stats webhook
app.post('/send-stats', async (req, res) => {
  try {
    const { stats, requestedBy } = req.body;
    await webhook.sendStatsMessage(stats, requestedBy || 'API Request');
    res.json({ success: true, message: 'Stats sent to webhook' });
  } catch (error) {
    console.error('Failed to send stats:', error.message);
    res.status(500).json({ error: 'Failed to send stats' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'online', 
    webhook_configured: !!process.env.DISCORD_WEBHOOK_URL,
    timestamp: new Date().toISOString()
  });
});

// Start the webhook API server (only if this file is run directly)
if (require.main === module) {
  const PORT = process.env.WEBHOOK_API_PORT || 3001;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 Webhook API server running on port ${PORT}`);
  });
}

module.exports = { app, webhook };
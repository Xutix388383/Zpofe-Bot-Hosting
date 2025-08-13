
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const WebhookManager = require('./webhook');

const app = express();
app.use(express.json());

const webhook = new WebhookManager(process.env.DISCORD_WEBHOOK_URL);
const apiUrl = process.env.API_URL.replace(/\/+$/, '');
const keysFilePath = path.join(__dirname, 'keys.json');

// Helper function to load keys data
function loadKeysData() {
  let keysData = { keys: [] };
  if (fs.existsSync(keysFilePath)) {
    try {
      keysData = JSON.parse(fs.readFileSync(keysFilePath, 'utf8'));
    } catch (parseError) {
      console.error('Failed to parse keys.json:', parseError.message);
    }
  }
  return keysData;
}

// Helper function to save keys data
function saveKeysData(keysData) {
  fs.writeFileSync(keysFilePath, JSON.stringify(keysData, null, 2));
}

// Generate permanent keys
app.post('/api/generate', async (req, res) => {
  try {
    const { amount = 1 } = req.body;
    
    if (amount < 1 || amount > 10) {
      return res.status(400).json({ error: 'Amount must be between 1 and 10 keys' });
    }

    const keys = [];
    let keysData = loadKeysData();

    for (let i = 0; i < amount; i++) {
      const response = await axios.post(`${apiUrl}/genkey`);
      const newKey = response.data.key;
      keys.push(newKey);

      const keyData = {
        key: newKey,
        type: 'permanent',
        created: new Date().toISOString(),
        expiresAt: null,
        expiresInMinutes: null
      };
      keysData.keys.push(keyData);
      
      await webhook.logKeyAttempt(keyData, 'Generated', 'API Request');
    }

    saveKeysData(keysData);

    res.json({
      success: true,
      message: `Generated ${amount} keys successfully`,
      keys: keys
    });
  } catch (error) {
    console.error('Generate API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate keys' });
  }
});

// Generate temporary keys
app.post('/api/tempkey', async (req, res) => {
  try {
    const { time, amount = 1 } = req.body;
    
    if (!time || time < 1 || time > 1440) {
      return res.status(400).json({ error: 'Time must be between 1 and 1440 minutes' });
    }
    if (amount < 1 || amount > 10) {
      return res.status(400).json({ error: 'Amount must be between 1 and 10 keys' });
    }

    const keys = [];
    let keysData = loadKeysData();

    for (let i = 0; i < amount; i++) {
      const response = await axios.post(`${apiUrl}/genkey`);
      const tempKey = response.data.key;
      keys.push(tempKey);

      const keyData = {
        key: tempKey,
        type: 'temporary',
        created: new Date().toISOString(),
        expiresAt: new Date(Date.now() + time * 60 * 1000).toISOString(),
        expiresInMinutes: time
      };
      keysData.keys.push(keyData);
      
      await webhook.logKeyAttempt(keyData, 'Generated', 'API Request');

      // Set timer to delete key
      setTimeout(async () => {
        try {
          await axios.post(`${apiUrl}/deletekey`, { key: tempKey });
          console.log(`🗑️ Temporary key ${tempKey} automatically deleted after ${time} minutes`);
          
          const currentData = loadKeysData();
          currentData.keys = currentData.keys.filter(k => k.key !== tempKey);
          saveKeysData(currentData);
          
          await webhook.logKeyAttempt({ key: tempKey }, 'Expired', 'System Cleanup', true);
        } catch (deleteError) {
          console.error('Failed to delete temporary key:', deleteError.response?.data || deleteError.message);
        }
      }, time * 60 * 1000);
    }

    saveKeysData(keysData);

    res.json({
      success: true,
      message: `Generated ${amount} temporary key${amount > 1 ? 's' : ''} (expires in ${time} minute${time > 1 ? 's' : ''})`,
      keys: keys,
      expiresAt: new Date(Date.now() + time * 60 * 1000).toISOString()
    });
  } catch (error) {
    console.error('Temp Key API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to generate temporary keys' });
  }
});

// Delete a key
app.delete('/api/deletekey', async (req, res) => {
  try {
    const { key } = req.body;
    
    if (!key || key.trim().length === 0) {
      return res.status(400).json({ error: 'Please provide a valid license key' });
    }

    const response = await axios.post(`${apiUrl}/deletekey`, { key: key.trim() });

    if (response.data.success) {
      let keysData = loadKeysData();
      keysData.keys = keysData.keys.filter(k => k.key !== key.trim());
      saveKeysData(keysData);
      
      await webhook.logKeyAttempt({ key }, 'Deleted', 'API Request', true);
    }

    res.json({
      success: response.data.success,
      message: response.data.success 
        ? `Key ${key} deleted successfully`
        : `Failed to delete key: ${response.data.message || 'Unknown error'}`
    });
  } catch (error) {
    console.error('Delete Key API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      res.status(404).json({ error: 'Key not found or already deleted' });
    } else if (error.response?.status === 400) {
      res.status(400).json({ error: 'Invalid key format' });
    } else {
      res.status(500).json({ error: 'Failed to delete key - server error' });
    }
  }
});

// Reset HWID for a key
app.post('/api/resethwid', async (req, res) => {
  try {
    const { key } = req.body;
    
    if (!key || key.trim().length === 0) {
      return res.status(400).json({ error: 'Please provide a valid license key' });
    }

    const response = await axios.post(`${apiUrl}/resethwid`, { key: key.trim() });

    if (response.data.success) {
      let keysData = loadKeysData();
      const keyIndex = keysData.keys.findIndex(k => k.key === key.trim());
      if (keyIndex !== -1) {
        keysData.keys[keyIndex].hwidReset = new Date().toISOString();
        saveKeysData(keysData);
      }
      
      await webhook.logKeyAttempt({ key, hwidReset: new Date().toISOString() }, 'HWID Reset', 'API Request', true);
    }

    res.json({
      success: response.data.success,
      message: response.data.success
        ? `HWID reset successfully for key ${key}`
        : `Failed to reset HWID: ${response.data.message || 'Unknown error'}`
    });
  } catch (error) {
    console.error('Reset HWID API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 404) {
      res.status(404).json({ error: 'Key not found' });
    } else if (error.response?.status === 400) {
      res.status(400).json({ error: 'Invalid key format or key not bound to HWID' });
    } else {
      res.status(500).json({ error: 'Failed to reset HWID - server error' });
    }
  }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
  try {
    const response = await axios.get(`${apiUrl}/stats`);
    
    let localStats = { total: 0, permanent: 0, temporary: 0, active: 0, expired: 0 };
    const keysData = loadKeysData();
    localStats.total = keysData.keys.length;
    localStats.permanent = keysData.keys.filter(k => k.type === 'permanent').length;
    const now = new Date();
    localStats.temporary = keysData.keys.filter(k => k.type === 'temporary').length;
    localStats.active = keysData.keys.filter(k => 
      k.type === 'permanent' || (k.type === 'temporary' && new Date(k.expiresAt) > now)
    ).length;
    localStats.expired = keysData.keys.filter(k => 
      k.type === 'temporary' && new Date(k.expiresAt) <= now
    ).length;

    const stats = {
      api: response.data,
      local: localStats,
      combined: {
        totalKeys: response.data.total || 0,
        permanent: localStats.permanent,
        temporary: localStats.temporary,
        active: localStats.active,
        expired: localStats.expired,
        bound: response.data.bound || 0,
        unbound: response.data.unbound || 0
      }
    };

    await webhook.sendStatsMessage(stats.combined, 'API Request');

    res.json(stats);
  } catch (error) {
    console.error('Stats API Error:', error.response?.data || error.message);
    
    if (error.response?.status === 503) {
      res.status(503).json({ error: 'Stats service temporarily unavailable' });
    } else if (error.response?.status === 401) {
      res.status(401).json({ error: 'Unauthorized access to stats' });
    } else {
      res.status(500).json({ error: 'Failed to fetch stats - server error' });
    }
  }
});

// List keys with filtering
app.get('/api/listkeys', (req, res) => {
  try {
    const { type } = req.query; // all, permanent, temporary, active
    const keysData = loadKeysData();
    
    if (keysData.keys.length === 0) {
      return res.json({ keys: [], message: 'No keys found in storage' });
    }

    let filteredKeys = keysData.keys;
    const now = new Date();

    switch (type) {
      case 'permanent':
        filteredKeys = keysData.keys.filter(k => k.type === 'permanent');
        break;
      case 'temporary':
        filteredKeys = keysData.keys.filter(k => k.type === 'temporary');
        break;
      case 'active':
        filteredKeys = keysData.keys.filter(k => 
          k.type === 'permanent' || (k.type === 'temporary' && new Date(k.expiresAt) > now)
        );
        break;
      case 'expired':
        filteredKeys = keysData.keys.filter(k => 
          k.type === 'temporary' && new Date(k.expiresAt) <= now
        );
        break;
      default:
        filteredKeys = keysData.keys;
    }

    res.json({
      keys: filteredKeys,
      count: filteredKeys.length,
      filter: type || 'all'
    });
  } catch (error) {
    console.error('List Keys Error:', error.message);
    res.status(500).json({ error: 'Failed to list keys' });
  }
});

// Check key expiration times
app.get('/api/checktime', (req, res) => {
  try {
    const { key } = req.query;
    const keysData = loadKeysData();

    if (key) {
      const foundKey = keysData.keys.find(k => k.key === key.trim());
      if (!foundKey) {
        return res.status(404).json({ error: 'Key not found in storage' });
      }

      const keyInfo = {
        key: foundKey.key,
        type: foundKey.type,
        created: foundKey.created
      };

      if (foundKey.type === 'temporary') {
        const now = new Date();
        const expiresAt = new Date(foundKey.expiresAt);
        const timeLeft = expiresAt - now;
        
        keyInfo.expiresAt = foundKey.expiresAt;
        keyInfo.expired = timeLeft <= 0;
        keyInfo.timeLeftMinutes = Math.max(0, Math.floor(timeLeft / (1000 * 60)));
      } else {
        keyInfo.expires = 'Never (Permanent)';
      }

      return res.json({ keyInfo });
    }

    // Show all temporary keys with their expiration info
    const tempKeys = keysData.keys.filter(k => k.type === 'temporary');
    const now = new Date();
    
    const keyTimes = tempKeys.map(k => {
      const expiresAt = new Date(k.expiresAt);
      const timeLeft = expiresAt - now;
      
      return {
        key: k.key,
        created: k.created,
        expiresAt: k.expiresAt,
        expired: timeLeft <= 0,
        timeLeftMinutes: Math.max(0, Math.floor(timeLeft / (1000 * 60)))
      };
    });

    res.json({
      temporaryKeys: keyTimes,
      count: tempKeys.length
    });
  } catch (error) {
    console.error('Check Time Error:', error.message);
    res.status(500).json({ error: 'Failed to check key times' });
  }
});

// Cleanup expired keys
app.delete('/api/cleanup', async (req, res) => {
  try {
    let keysData = loadKeysData();
    const now = new Date();
    
    const expiredKeys = keysData.keys.filter(k => 
      k.type === 'temporary' && new Date(k.expiresAt) <= now
    );

    if (expiredKeys.length === 0) {
      return res.json({ message: 'No expired keys to clean up', removedCount: 0 });
    }

    // Remove expired keys from API and local storage
    const cleanupResults = [];
    for (const expiredKey of expiredKeys) {
      try {
        await axios.post(`${apiUrl}/deletekey`, { key: expiredKey.key });
        cleanupResults.push({ key: expiredKey.key, success: true });
      } catch (error) {
        cleanupResults.push({ key: expiredKey.key, success: false, error: error.message });
      }
    }

    // Remove from local storage
    keysData.keys = keysData.keys.filter(k => 
      !(k.type === 'temporary' && new Date(k.expiresAt) <= now)
    );
    saveKeysData(keysData);

    res.json({
      message: `Cleaned up ${expiredKeys.length} expired keys`,
      removedCount: expiredKeys.length,
      results: cleanupResults
    });
  } catch (error) {
    console.error('Cleanup Error:', error.message);
    res.status(500).json({ error: 'Failed to cleanup expired keys' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/generate - Generate permanent keys',
      'POST /api/tempkey - Generate temporary keys',
      'DELETE /api/deletekey - Delete a key',
      'POST /api/resethwid - Reset HWID for a key',
      'GET /api/stats - Get key statistics',
      'GET /api/listkeys - List keys with filtering',
      'GET /api/checktime - Check key expiration times',
      'DELETE /api/cleanup - Clean up expired keys'
    ]
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('API Error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start the API server
if (require.main === module) {
  const PORT = process.env.API_SERVER_PORT || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API server running on port ${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;

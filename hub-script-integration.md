# Hub Script Integration Guide

This guide explains how to integrate your hub script with the Discord webhook logging system.

## Webhook API Endpoints

The bot provides HTTP endpoints for your hub script to send usage data:

### Base URL
```
http://localhost:3001  (when running locally)
```

### Available Endpoints

#### 1. Log Key Usage Attempts
**POST** `/log-key-usage`

Logs when someone tries to use a key in your script.

**Request Body:**
```json
{
  "key": "your-license-key",
  "userId": "user123",
  "hwid": "hardware-id-hash",
  "ip": "192.168.1.1",
  "success": true,
  "reason": "Authentication successful"
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:3001/log-key-usage \
  -H "Content-Type: application/json" \
  -d '{
    "key": "ABC123XYZ",
    "userId": "user123",
    "hwid": "a1b2c3d4e5f6",
    "ip": "192.168.1.1",
    "success": true,
    "reason": "Authentication successful"
  }'
```

#### 2. System Status Updates
**POST** `/system-status`

Sends periodic status updates about your system.

**Request Body:**
```json
{
  "botOnline": true,
  "apiOnline": true,
  "activeKeys": 25,
  "connectedUsers": 12,
  "uptime": "2d 4h 30m",
  "databaseStatus": "Connected"
}
```

#### 3. Manual Stats Report
**POST** `/send-stats`

Manually trigger a stats report to Discord.

**Request Body:**
```json
{
  "stats": {
    "totalKeys": 100,
    "permanent": 75,
    "temporary": 25,
    "active": 85,
    "expired": 15,
    "hwidResets": 5
  },
  "requestedBy": "Hub Script"
}
```

## Integration Examples

### Python Hub Script Example
```python
import requests
import json

WEBHOOK_API_URL = "http://localhost:3001"

def log_key_usage(key, user_id, hwid, ip, success, reason=None):
    """Log key usage attempt to Discord webhook"""
    data = {
        "key": key,
        "userId": user_id,
        "hwid": hwid,
        "ip": ip,
        "success": success,
        "reason": reason or ("Authentication successful" if success else "Authentication failed")
    }
    
    try:
        response = requests.post(f"{WEBHOOK_API_URL}/log-key-usage", json=data)
        if response.status_code == 200:
            print("✅ Usage logged to Discord")
        else:
            print(f"❌ Failed to log usage: {response.text}")
    except Exception as e:
        print(f"❌ Error logging usage: {e}")

def send_system_status(active_keys, connected_users, uptime):
    """Send system status to Discord"""
    data = {
        "botOnline": True,
        "apiOnline": True,
        "activeKeys": active_keys,
        "connectedUsers": connected_users,
        "uptime": uptime,
        "databaseStatus": "Connected"
    }
    
    try:
        response = requests.post(f"{WEBHOOK_API_URL}/system-status", json=data)
        if response.status_code == 200:
            print("✅ Status sent to Discord")
    except Exception as e:
        print(f"❌ Error sending status: {e}")

# Example usage in your script
if key_is_valid(user_key):
    log_key_usage(user_key, user_id, hwid, ip_address, True, "Valid key")
    # Continue with script execution
else:
    log_key_usage(user_key, user_id, hwid, ip_address, False, "Invalid or expired key")
    # Reject access
```

### JavaScript/Node.js Hub Script Example
```javascript
const axios = require('axios');

const WEBHOOK_API_URL = 'http://localhost:3001';

async function logKeyUsage(key, userId, hwid, ip, success, reason) {
    try {
        await axios.post(`${WEBHOOK_API_URL}/log-key-usage`, {
            key,
            userId,
            hwid,
            ip,
            success,
            reason: reason || (success ? 'Authentication successful' : 'Authentication failed')
        });
        console.log('✅ Usage logged to Discord');
    } catch (error) {
        console.log('❌ Failed to log usage:', error.message);
    }
}

async function sendSystemStatus(activeKeys, connectedUsers, uptime) {
    try {
        await axios.post(`${WEBHOOK_API_URL}/system-status`, {
            botOnline: true,
            apiOnline: true,
            activeKeys,
            connectedUsers,
            uptime,
            databaseStatus: 'Connected'
        });
        console.log('✅ Status sent to Discord');
    } catch (error) {
        console.log('❌ Failed to send status:', error.message);
    }
}

// Example usage
if (await validateKey(userKey)) {
    await logKeyUsage(userKey, userId, hwid, ipAddress, true);
    // Continue with script execution
} else {
    await logKeyUsage(userKey, userId, hwid, ipAddress, false, 'Invalid key');
    // Reject access
}
```

## Setup Instructions

1. **Start the webhook API server:**
   ```bash
   node webhook-api.js
   ```
   
2. **Configure your Discord webhook URL:**
   Add `DISCORD_WEBHOOK_URL` to your `.env` file

3. **Update your hub script:**
   Add the logging functions from the examples above

4. **Test the integration:**
   ```bash
   curl http://localhost:3001/health
   ```

## Environment Variables Required

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-url
WEBHOOK_API_PORT=3001  # Optional, defaults to 3001
```

## What Gets Logged

The Discord webhook will show:
- ✅/❌ Key usage attempts with user info
- 📊 Detailed statistics when requested
- 🔧 System status updates
- 🔑 Key generation/deletion activities
- 🔄 HWID reset operations

All messages are sent as rich embeds with color-coded status indicators and detailed information.
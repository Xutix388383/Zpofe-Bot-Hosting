const axios = require('axios');

class WebhookManager {
  constructor(webhookUrl) {
    this.webhookUrl = webhookUrl;
  }

  async sendStatsMessage(stats, requestedBy) {
    if (!this.webhookUrl) {
      console.log('Webhook URL not configured, skipping stats message');
      return;
    }

    try {
      const embed = {
        title: "📊 Key Statistics Report",
        color: 0x00ff00, // Green color
        fields: [
          {
            name: "🔑 Total Keys Generated",
            value: `${stats.totalKeys || 0}`,
            inline: true
          },
          {
            name: "♾️ Permanent Keys",
            value: `${stats.permanent || 0}`,
            inline: true
          },
          {
            name: "⏳ Temporary Keys",
            value: `${stats.temporary || 0}`,
            inline: true
          },
          {
            name: "🟢 Active Keys",
            value: `${stats.active || 0}`,
            inline: true
          },
          {
            name: "🔴 Expired Keys",
            value: `${stats.expired || 0}`,
            inline: true
          },
          {
            name: "🔄 HWID Resets",
            value: `${stats.hwidResets || 0}`,
            inline: true
          }
        ],
        footer: {
          text: `Requested by ${requestedBy} • ${new Date().toLocaleString()}`
        },
        timestamp: new Date().toISOString()
      };

      await axios.post(this.webhookUrl, {
        embeds: [embed]
      });

      console.log('Stats webhook message sent successfully');
    } catch (error) {
      console.error('Failed to send stats webhook:', error.message);
    }
  }

  async logKeyAttempt(keyData, action, user, success = true) {
    if (!this.webhookUrl) {
      console.log('Webhook URL not configured, skipping key attempt log');
      return;
    }

    try {
      const color = success ? 0x00ff00 : 0xff0000; // Green for success, red for failure
      const statusEmoji = success ? "✅" : "❌";
      
      const embed = {
        title: `${statusEmoji} Key ${action}`,
        color: color,
        fields: [
          {
            name: "🔑 Key",
            value: `\`${keyData.key || 'Unknown'}\``,
            inline: true
          },
          {
            name: "📝 Action",
            value: action,
            inline: true
          },
          {
            name: "👤 User",
            value: user,
            inline: true
          }
        ],
        timestamp: new Date().toISOString()
      };

      // Add additional fields based on action type
      if (action === 'Generated') {
        embed.fields.push({
          name: "🏷️ Type",
          value: keyData.type === 'permanent' ? '♾️ Permanent' : '⏳ Temporary',
          inline: true
        });
        
        if (keyData.type === 'temporary' && keyData.expiresAt) {
          embed.fields.push({
            name: "⏰ Expires",
            value: new Date(keyData.expiresAt).toLocaleString(),
            inline: true
          });
        }
      }

      if (action === 'HWID Reset' && keyData.hwidReset) {
        embed.fields.push({
          name: "🔄 Reset Time",
          value: new Date(keyData.hwidReset).toLocaleString(),
          inline: true
        });
      }

      await axios.post(this.webhookUrl, {
        embeds: [embed]
      });

      console.log(`Key ${action.toLowerCase()} webhook logged successfully`);
    } catch (error) {
      console.error(`Failed to log key ${action.toLowerCase()} webhook:`, error.message);
    }
  }

  async logScriptUsage(scriptData) {
    if (!this.webhookUrl) {
      console.log('Webhook URL not configured, skipping script usage log');
      return;
    }

    try {
      const embed = {
        title: "🖥️ Script Usage Activity",
        color: 0x0099ff, // Blue color
        fields: [
          {
            name: "🔑 Key Used",
            value: `\`${scriptData.key}\``,
            inline: true
          },
          {
            name: "👤 User ID",
            value: scriptData.userId || 'Unknown',
            inline: true
          },
          {
            name: "💻 HWID",
            value: scriptData.hwid ? `\`${scriptData.hwid.substring(0, 8)}...\`` : 'Not provided',
            inline: true
          },
          {
            name: "🌐 IP Address",
            value: scriptData.ip || 'Unknown',
            inline: true
          },
          {
            name: "📊 Status",
            value: scriptData.success ? '🟢 Success' : '🔴 Failed',
            inline: true
          },
          {
            name: "📝 Reason",
            value: scriptData.reason || 'Authentication successful',
            inline: true
          }
        ],
        footer: {
          text: `Hub Script Activity • ${new Date().toLocaleString()}`
        },
        timestamp: new Date().toISOString()
      };

      await axios.post(this.webhookUrl, {
        embeds: [embed]
      });

      console.log('Script usage webhook logged successfully');
    } catch (error) {
      console.error('Failed to log script usage webhook:', error.message);
    }
  }

  async sendSystemStatus(statusData) {
    if (!this.webhookUrl) {
      console.log('Webhook URL not configured, skipping system status');
      return;
    }

    try {
      const embed = {
        title: "🔧 System Status Update",
        color: 0xff9900, // Orange color
        fields: [
          {
            name: "🤖 Bot Status",
            value: statusData.botOnline ? '🟢 Online' : '🔴 Offline',
            inline: true
          },
          {
            name: "🌐 API Status",
            value: statusData.apiOnline ? '🟢 Connected' : '🔴 Disconnected',
            inline: true
          },
          {
            name: "📊 Active Keys",
            value: `${statusData.activeKeys || 0}`,
            inline: true
          },
          {
            name: "👥 Connected Users",
            value: `${statusData.connectedUsers || 0}`,
            inline: true
          },
          {
            name: "📈 Uptime",
            value: statusData.uptime || 'Unknown',
            inline: true
          },
          {
            name: "🗃️ Database",
            value: statusData.databaseStatus || 'Unknown',
            inline: true
          }
        ],
        timestamp: new Date().toISOString()
      };

      await axios.post(this.webhookUrl, {
        embeds: [embed]
      });

      console.log('System status webhook sent successfully');
    } catch (error) {
      console.error('Failed to send system status webhook:', error.message);
    }
  }
}

module.exports = WebhookManager;
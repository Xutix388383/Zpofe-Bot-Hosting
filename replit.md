# Discord License Key Management Bot

## Overview

This is a Discord bot designed to manage license keys for the "Zpofes" software through slash commands. The bot provides administrators with key generation, deletion, HWID management, and statistics tracking capabilities. It integrates with an external API for key management operations and implements role-based access control to ensure only authorized users can perform key management tasks.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Bot Framework
- **Discord.js v14**: Modern Discord API wrapper with slash command support
- **Command Pattern**: Modular command structure where each command is a separate file in the `/commands` directory
- **Event-Driven Architecture**: Uses Discord.js event handlers for bot lifecycle and interaction management

### Authentication & Authorization
- **Role-Based Access Control**: All commands require a specific Discord role (ID: `1398549353911685200`) 
- **Guild-Specific Deployment**: Commands are registered only to a specific Discord server (Guild ID: `1396597333143064667`)
- **Ephemeral Error Messages**: Unauthorized access attempts show private error messages

### Command Structure
- **Slash Commands**: Modern Discord interaction system for better UX
- **Ephemeral Responses**: All command outputs are private to the command user only
- **Input Validation**: Commands validate parameters before API calls
- **Error Handling**: Comprehensive error handling with user-friendly messages and detailed logging

### Core Features
1. **Key Generation** (`/generate`): Creates 1-10 new permanent license keys with JSON storage and webhook logging
2. **Key Deletion** (`/deletekey`): Permanently removes license keys from API and JSON storage with webhook logging
3. **HWID Reset** (`/resethwid`): Resets hardware ID bindings for keys with tracking in JSON and webhook logging
4. **Statistics** (`/stats`): Displays comprehensive statistics from both API and local storage, sends rich embed to webhook
5. **Temporary Keys** (`/tempkey [time] [amount]`): Creates 1-10 temporary keys with custom expiration time (1-1440 minutes) and webhook logging
6. **List Keys** (`/listkeys [type]`): Views all stored keys with filtering options (all/permanent/temporary/active)
7. **Clear Bot Messages** (`/clear [amount]`): Removes bot messages from channel (1-100, default 10)
8. **Check Key Times** (`/checktime [key]`): Displays expiration information for specific keys or all temporary keys
9. **Cleanup Storage** (`/cleanup`): Removes expired temporary keys from JSON storage

### API Integration Design
- **RESTful API Communication**: Uses Axios for HTTP requests to external key management service
- **Environment Configuration**: API URL and bot token stored in environment variables
- **Async Operations**: All API calls are properly awaited with timeout handling
- **Status Code Handling**: Specific error responses based on HTTP status codes (404, 400, 503, 401)

### Error Management
- **Graceful Degradation**: Bot continues operating even if individual commands fail
- **User Feedback**: Clear error messages for different failure scenarios
- **Logging**: Console logging for debugging API errors and bot events
- **Interaction Safety**: Handles both immediate replies and deferred responses for longer operations

### Local Storage System
- **keys.json**: Local file storage for all generated keys with metadata
- **Key Metadata**: Tracks creation time, expiration, type (permanent/temporary), and HWID reset history
- **Automatic Cleanup**: Temporary keys are automatically removed from storage upon expiration
- **Manual Cleanup**: `/cleanup` command removes expired keys from storage
- **Time Tracking**: Real-time expiration monitoring and status reporting
- **Synchronization**: All API operations update local storage for consistency

## External Dependencies

### Discord Platform
- **Discord.js Library**: Official Discord API wrapper for Node.js (v14+ with modern flags)
- **Discord Bot Token**: Authentication credential stored in environment variables
- **Guild Integration**: Bot operates within a specific Discord server

### License Management API
- **External REST API**: Backend service handling key CRUD operations
- **Endpoints Used**:
  - `POST /genkey` - Generate new license keys
  - `POST /deletekey` - Remove existing keys
  - `POST /resethwid` - Reset hardware ID associations
  - `GET /stats` - Retrieve key statistics
- **API URL Configuration**: Base URL stored in `API_URL` environment variable with automatic trailing slash handling

### Runtime Dependencies
- **Node.js Environment**: JavaScript runtime for bot execution
- **Axios HTTP Client**: Promise-based HTTP client for API requests
- **Express.js**: Web framework for webhook API server
- **dotenv**: Environment variable management for configuration
- **File System Access**: Dynamic command loading and JSON storage management

### Webhook Integration System
- **Discord Webhook Logging**: Rich embed messages for all key operations and statistics
- **Hub Script Integration API**: HTTP endpoints for external script logging (port 3001)
- **Real-time Activity Monitoring**: Logs key usage attempts, system status, and user activities
- **Automated Notifications**: Webhook messages for key generation, deletion, HWID resets, and stats reports

### Development Tools
- **npm Package Management**: Dependency management and script execution
- **Environment Variables**: Secure configuration storage for sensitive data
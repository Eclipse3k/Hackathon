# Qubic Monitor

This application allows users to monitor Qubic blockchain accounts and receive notifications when specific triggers are activated. The primary use case is tracking balance changes, with future plans to support additional trigger types like transaction volume and inactivity alerts.

## Features

- **Real-time Balance Monitoring**: Track Qubic account balances with automatic updates
- **Multi-Channel Notifications**: 
  - In-app notifications via bell icon
  - Webhook integrations for third-party services
  - Real-time UI updates
- **Dashboard Statistics**: 
  - Total monitored accounts
  - Aggregated balance across all accounts
  - Recent change counter
- **Account Management**: Add and remove accounts from monitoring with a simple interface

## Architecture

The project consists of two main components:

### Backend (`/backend`)
- Node.js server built with Express
- REST API for account management
- WebSocket server for real-time notifications
- Polling system to check account balances on Qubic blockchain

### Frontend (`/frontend`)
- Modern responsive dashboard
- Real-time updates via WebSocket connection
- Toast notifications for important events
- Account management interface

## API Reference

The backend provides the following REST API endpoints:

- `GET /accounts` - List all monitored accounts
- `GET /accounts/:accountId` - Get details for a specific account
- `POST /accounts` - Add an account to monitoring
- `DELETE /accounts/:accountId` - Remove an account from monitoring

## Webhook Integration

When a monitored account experiences a balance change, the system sends a POST request to the registered webhook URL with the following payload:

```json
{
  "accountId": "QUBIC_ACCOUNT_ID",
  "previousBalance": { "balance": 100 },
  "currentBalance": { "balance": 150 },
  "change": 50,
  "timestamp": "2025-03-23T12:34:56.789Z"
}
```

This enables integration with services like Make.com to create custom automation workflows.

## License

This project is licensed under the terms found in the LICENSE file in the root directory.

## Acknowledgments

- Qubic blockchain project for providing the API to query account balances
- All contributors to the hackathon project

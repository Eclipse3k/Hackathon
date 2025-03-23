# Qubic Balance Monitor

A real-time dashboard for monitoring Qubic account balances and receiving instant notifications when balance changes occur.

## Overview

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

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository
   ```
   git clone https://github.com/Eclipse3k/Hackathon.git
   cd Hackathon
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Start the backend server
   ```
   node backend/api_balances.js
   ```

4. Open the frontend in your browser
   ```
   open frontend/index.html
   ```
   
   Alternatively, you can use a simple HTTP server:
   ```
   npx http-server frontend
   ```

## Usage

1. Add a Qubic account to monitor by clicking the "Add Trigger" button
2. Enter the Qubic account ID and a webhook URL (where notifications will be sent)
3. The dashboard will display the current balance and monitor for changes
4. When a balance change is detected:
   - A notification appears in the bell icon
   - The "Recent Changes" counter increases
   - The total balance updates immediately
   - A toast notification appears temporarily

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

## Future Enhancements

- Additional trigger types:
  - High transaction volume detection
  - Account inactivity alerts
  - Threshold-based notifications
- User authentication system
- Custom notification preferences
- Historical balance tracking
- Advanced analytics dashboard

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the terms found in the LICENSE file in the root directory.

## Acknowledgments

- Qubic blockchain project for providing the API to query account balances
- All contributors to the hackathon project
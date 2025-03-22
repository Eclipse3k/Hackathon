const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Add CORS import
const QUBIC_RPC_URL = 'https://rpc.qubic.org/v1';
const PORT = process.env.PORT || 3000;

// Store for monitored accounts and their balances
const monitoredAccounts = {};

// Express setup
const app = express();
app.use(bodyParser.json());
app.use(cors()); // Enable CORS for all routes

// Obtener balance de una cuenta
async function getBalance(accountId) {
    try {
        const response = await axios.get(`${QUBIC_RPC_URL}/balances/${accountId}`);
        return response.data.balance;
    } catch (error) {
        console.error(`❌ Error obteniendo balance de ${accountId}:`, error.message);
        return null;
    }
}

// Monitorear cambios de saldo para todas las cuentas
async function monitorBalances() {
    console.log("🔍 Consultando balances de todas las cuentas...");

    for (const accountId in monitoredAccounts) {
        const currentBalance = await getBalance(accountId);
        
        if (currentBalance === null) continue;

        const account = monitoredAccounts[accountId];
        
        if (account.previousBalance !== null && currentBalance.balance !== account.previousBalance.balance) {
            console.log(`🚀 La cuenta ${accountId} ha recibido ${currentBalance.balance - account.previousBalance.balance} unidades.`);
            
            // Store this event in the history
            account.history.push({
                timestamp: new Date(),
                previousBalance: account.previousBalance.balance,
                currentBalance: currentBalance.balance,
                change: currentBalance.balance - account.previousBalance.balance
            });
            
            // Keep history limited to last 100 events
            if (account.history.length > 100) {
                account.history.shift();
            }
        }

        account.previousBalance = currentBalance;
    }

    setTimeout(monitorBalances, 5000);
}

// API Endpoints

// Add an account to monitor
app.post('/accounts', (req, res) => {
    const { accountId } = req.body;
    
    if (!accountId) {
        return res.status(400).json({ error: 'Account ID is required' });
    }
    
    // Check if account is already being monitored
    if (monitoredAccounts[accountId]) {
        return res.status(409).json({ error: 'Account is already being monitored' });
    }
    
    // Add account to monitored accounts
    monitoredAccounts[accountId] = {
        previousBalance: null,
        history: [],
        addedAt: new Date()
    };
    
    console.log(`✅ Account ${accountId} added for monitoring`);
    res.status(201).json({ message: 'Account added for monitoring', accountId });
});

// Remove an account from monitoring
app.delete('/accounts/:accountId', (req, res) => {
    const { accountId } = req.params;
    
    if (!monitoredAccounts[accountId]) {
        return res.status(404).json({ error: 'Account not found' });
    }
    
    delete monitoredAccounts[accountId];
    console.log(`❌ Account ${accountId} removed from monitoring`);
    res.json({ message: 'Account removed from monitoring', accountId });
});

// Get all monitored accounts
app.get('/accounts', (req, res) => {
    const accounts = Object.keys(monitoredAccounts).map(accountId => ({
        accountId,
        addedAt: monitoredAccounts[accountId].addedAt,
        currentBalance: monitoredAccounts[accountId].previousBalance?.balance || 'Unknown'
    }));
    
    res.json({ accounts });
});

// Get details for a specific account
app.get('/accounts/:accountId', (req, res) => {
    const { accountId } = req.params;
    
    if (!monitoredAccounts[accountId]) {
        return res.status(404).json({ error: 'Account not found' });
    }
    
    res.json({
        accountId,
        addedAt: monitoredAccounts[accountId].addedAt,
        currentBalance: monitoredAccounts[accountId].previousBalance?.balance || 'Unknown',
        history: monitoredAccounts[accountId].history
    });
});

// Start the server and monitoring
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log('🔍 Starting balance monitoring...');
    monitorBalances();
});
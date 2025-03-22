const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');

const QUBIC_RPC_URL = 'https://rpc.qubic.org/v1';
const PORT = process.env.PORT || 3000;

// Store for monitored accounts and their webhooks
const monitoredAccounts = {};

// Express setup
const app = express();
app.use(bodyParser.json());

// Obtener balance de una cuenta
async function getBalance(accountId) {
    try {
        const response = await axios.get(`${QUBIC_RPC_URL}/balances/${accountId}`);
        return response.data.balance;
    } catch (error) {
        console.error(`❌ Error obteniendo balance de ${accountId}: ${error.message}`);
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
            const change = currentBalance.balance - account.previousBalance.balance;
            console.log(`🚀 La cuenta ${accountId} ha recibido ${change} unidades.`);
            
            // Enviar notificación al webhook
            try {
                await axios.post(account.webhook, {
                    accountId,
                    previousBalance: account.previousBalance,
                    currentBalance,
                    change,
                    timestamp: new Date().toISOString()
                });
                console.log(`✅ Notificación enviada al webhook: ${account.webhook}`);
            } catch (error) {
                console.error(`❌ Error enviando notificación al webhook: ${error.message}`);
            }
        }

        account.previousBalance = currentBalance;
    }

    setTimeout(monitorBalances, 5000);
}

// API Endpoints

// Add an account to monitor
app.post('/accounts', (req, res) => {
    const { accountId, webhook } = req.body;
    
    if (!accountId || !webhook) {
        return res.status(400).json({ error: 'Account ID and webhook are required' });
    }
    
    if (monitoredAccounts[accountId]) {
        return res.status(409).json({ error: 'Account is already being monitored' });
    }
    
    monitoredAccounts[accountId] = {
        webhook,
        previousBalance: null,
        addedAt: new Date()
    };
    
    console.log(`✅ Account ${accountId} added for monitoring with webhook ${webhook}`);
    res.status(201).json({ message: 'Account added for monitoring', accountId, webhook });
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
        webhook: monitoredAccounts[accountId].webhook,
        addedAt: monitoredAccounts[accountId].addedAt,
        currentBalance: monitoredAccounts[accountId].previousBalance || 'Unknown'
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
        webhook: monitoredAccounts[accountId].webhook,
        addedAt: monitoredAccounts[accountId].addedAt,
        currentBalance: monitoredAccounts[accountId].previousBalance || 'Unknown'
    });
});

// Start the server and monitoring
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log('🔍 Starting balance monitoring...');
    monitorBalances();
});

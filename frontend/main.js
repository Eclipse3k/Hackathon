// Global Variables
let apiBaseUrl = 'http://localhost:3000';
let currentApiVersion = 'balances';
let monitoredAccounts = [];
let recentBalanceChanges = 0;
let socket; // WebSocket connection
let notificationCount = 0;
let notifications = [];

// DOM Elements
const apiVersionSelect = document.getElementById('api-version');
const accountsList = document.getElementById('accounts-list');
const totalAccountsEl = document.getElementById('total-accounts');
const totalBalanceEl = document.getElementById('total-balance');
const recentChangesEl = document.getElementById('recent-changes');
const addAccountBtn = document.getElementById('add-account-btn');
const addAccountModal = document.getElementById('add-account-modal');
const closeModalBtn = document.querySelector('.close');
const cancelAddBtn = document.getElementById('cancel-add');
const confirmAddBtn = document.getElementById('confirm-add');
const accountIdInput = document.getElementById('account-id');
const webhookUrlInput = document.getElementById('webhook-url');
const triggerTypeSelect = document.getElementById('trigger-type');
const notificationToast = document.getElementById('notification-toast');
const notificationMessage = document.getElementById('notification-message');
const notificationBadge = document.getElementById('notification-count');
const notificationsList = document.getElementById('notifications-list');
const clearNotificationsBtn = document.getElementById('clear-notifications');

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Add Account button click handler
    addAccountBtn.addEventListener('click', () => {
        accountIdInput.value = '';
        webhookUrlInput.value = '';
        addAccountModal.classList.add('active');
    });

    // Close modal handlers
    closeModalBtn.addEventListener('click', () => {
        addAccountModal.classList.remove('active');
    });

    cancelAddBtn.addEventListener('click', () => {
        addAccountModal.classList.remove('active');
    });

    // Handle click outside modal to close
    window.addEventListener('click', (event) => {
        if (event.target === addAccountModal) {
            addAccountModal.classList.remove('active');
        }
    });

    // Add account submission handler
    confirmAddBtn.addEventListener('click', addAccount);

    // Initialize dashboard
    loadAllAccounts();

    // Refresh dashboard periodically
    setInterval(loadAllAccounts, 5000); // Refresh every 5 seconds

    // Initialize WebSocket connection
    initializeWebSocket();
    
    // Clear notifications button event listener
    clearNotificationsBtn.addEventListener('click', () => {
        notifications = [];
        notificationCount = 0;
        notificationBadge.textContent = "0";
        renderNotifications();
    });
});

// API Functions
async function callApi(endpoint, method, body = null) {
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(`${apiBaseUrl}${endpoint}`, options);
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        showNotification(`Error: ${error.message}`, true);
        console.error('API Error:', error);
        return null;
    }
}

// Load all accounts from API
async function loadAllAccounts() {
    const data = await callApi('/accounts', 'GET');
    if (!data) return;

    monitoredAccounts = data.accounts || [];
    renderAccountsTable();
    updateDashboardStats();
}

// Add a new account
async function addAccount() {
    const accountId = accountIdInput.value.trim();
    const webhookUrl = webhookUrlInput.value.trim();
    const triggerType = triggerTypeSelect.value;
    
    if (!accountId) {
        showNotification('Error: Account ID is required', true);
        return;
    }
    
    let body = { 
        accountId,
        triggerType
    };
    
    if (currentApiVersion === 'balances') {
        if (!webhookUrl) {
            showNotification('Error: Webhook URL is required for api_balances', true);
            return;
        }
        body.webhook = webhookUrl;
    }
    
    const result = await callApi('/accounts', 'POST', body);
    if (result) {
        showNotification('Account added successfully!');
        addAccountModal.classList.remove('active');
        loadAllAccounts();
    }
}

// Delete an account
async function deleteAccount(accountId) {
    if (!confirm(`Are you sure you want to remove account ${accountId} from monitoring?`)) {
        return;
    }
    
    const result = await callApi(`/accounts/${accountId}`, 'DELETE');
    if (result) {
        showNotification('Account removed successfully!');
        loadAllAccounts();
    }
}

// View account details
async function viewAccount(accountId) {
    const result = await callApi(`/accounts/${accountId}`, 'GET');
    if (result) {
        alert(JSON.stringify(result, null, 2));
    }
}

// Render accounts table
function renderAccountsTable() {
    accountsList.innerHTML = '';
    
    if (monitoredAccounts.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.innerHTML = `
            <td colspan="6" style="text-align: center; padding: 30px;">
                No accounts are being monitored. Click "Add Trigger" to start monitoring.
            </td>
        `;
        accountsList.appendChild(emptyRow);
        return;
    }
    
    monitoredAccounts.forEach(account => {
        const row = document.createElement('tr');
        
        // Format the balance
        let balanceDisplay = 'Unknown';
        if (account.currentBalance && account.currentBalance !== 'Unknown') {
            if (typeof account.currentBalance === 'object' && account.currentBalance.balance) {
                balanceDisplay = account.currentBalance.balance.toLocaleString();
            } else {
                balanceDisplay = account.currentBalance.toString();
            }
        }
        
        // Format the date
        const addedDate = new Date(account.addedAt);
        const dateOptions = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        const formattedDate = addedDate.toLocaleDateString(undefined, dateOptions);
        
        // Get trigger type display
        const triggerType = account.triggerType || 'balance-change';
        const triggerDisplay = triggerType === 'balance-change' ? 'Balance Change' : 'Unknown Trigger';
        
        // Create table row with account data
        row.innerHTML = `
            <td class="account-id" title="${account.accountId}">
                <div class="account-cell">
                    <span class="account-number">${truncateString(account.accountId, 16)}</span>
                    <span class="account-label">${triggerDisplay}</span>
                </div>
            </td>
            <td>
                <div class="balance-cell">
                    <span class="balance-amount">${balanceDisplay}</span>
                    <span class="balance-label">QUBIC</span>
                </div>
            </td>
            <td title="${account.webhook}">${truncateString(account.webhook || 'N/A', 25)}</td>
            <td>${formattedDate}</td>
            <td class="actions">
                <button class="btn-action view" onclick="viewAccount('${account.accountId}')" title="View Details">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-action delete" onclick="deleteAccount('${account.accountId}')" title="Remove Account">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        
        accountsList.appendChild(row);
    });
}

// Update dashboard statistics
function updateDashboardStats() {
    // Update total accounts
    totalAccountsEl.textContent = monitoredAccounts.length;
    
    // Calculate total balance
    let totalBalance = 0;
    let validBalanceCount = 0;
    
    monitoredAccounts.forEach(account => {
        if (account.currentBalance && account.currentBalance !== 'Unknown') {
            if (typeof account.currentBalance === 'object' && account.currentBalance.balance) {
				totalBalance += parseFloat(account.currentBalance.balance);
                validBalanceCount++;
            }
        }
    });
    
    // Display total balance
    totalBalanceEl.textContent = totalBalance.toLocaleString();
    
    // Simulating recent changes count (you might want to implement actual logic)
    recentChangesEl.textContent = recentBalanceChanges.toString();
}

// Helper Functions
function truncateString(str, maxLength) {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '...';
}

function showNotification(message, isError = false) {
    notificationMessage.textContent = message;
    
    const toastIcon = document.querySelector('.toast-icon i');
    if (isError) {
        toastIcon.className = 'fas fa-times-circle';
        document.querySelector('.toast-icon').classList.add('error');
    } else {
        toastIcon.className = 'fas fa-check-circle';
        document.querySelector('.toast-icon').classList.remove('error');
    }
    
    notificationToast.classList.add('active');
    
    setTimeout(() => {
        notificationToast.classList.remove('active');
    }, 3000);
}

// Initialize WebSocket connection
function initializeWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.hostname}:3000`;
    
    socket = new WebSocket(wsUrl);
    
    socket.addEventListener('open', () => {
        console.log('WebSocket connection established');
    });
    
    socket.addEventListener('message', (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    });
    
    socket.addEventListener('close', () => {
        console.log('WebSocket connection closed');
        // Try to reconnect after a delay
        setTimeout(initializeWebSocket, 5000);
    });
    
    socket.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
    });
}

// Handle WebSocket messages
function handleWebSocketMessage(data) {
    if (data.type === 'account-trigger') {
        // Update notification counter
        notificationCount++;
        notificationBadge.textContent = notificationCount;
        
        // Add to notifications list
        addNotification({
            title: `Balance Change for ${truncateString(data.accountId, 12)}`,
            message: `${data.change > 0 ? '+' : ''}${data.change} QUBIC (${new Date(data.timestamp).toLocaleTimeString()})`,
            time: data.timestamp,
            accountId: data.accountId
        });
        
        // Show toast notification
        showNotification(`Account ${truncateString(data.accountId, 12)} balance changed by ${data.change > 0 ? '+' : ''}${data.change}`, false);
        
        // Update recent changes counter
        recentBalanceChanges++;
        
        // Find the account in the monitored accounts list and update its balance
        const accountIndex = monitoredAccounts.findIndex(account => account.accountId === data.accountId);
        if (accountIndex !== -1) {
            monitoredAccounts[accountIndex].currentBalance = { balance: data.currentBalance };
            renderAccountsTable();
        }
        
        // Update the dashboard statistics
        updateDashboardStats();
    }
}

// Add notification to dropdown
function addNotification(notification) {
    // Add to notifications array
    notifications.unshift(notification);
    
    // Limit to 10 notifications
    if (notifications.length > 10) {
        notifications.pop();
    }
    
    // Render notifications
    renderNotifications();
}

// Render notifications in dropdown
function renderNotifications() {
    notificationsList.innerHTML = '';
    
    if (notifications.length === 0) {
        notificationsList.innerHTML = '<div class="empty-notifications">No notifications yet</div>';
        return;
    }
    
    notifications.forEach(notification => {
        const notificationItem = document.createElement('div');
        notificationItem.className = 'notification-item';
        
        const timestamp = new Date(notification.time);
        const timeString = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateString = timestamp.toLocaleDateString([], { month: 'short', day: 'numeric' });
        
        notificationItem.innerHTML = `
            <div class="notification-title">${notification.title}</div>
            <div class="notification-message">${notification.message}</div>
            <div class="notification-time">${dateString} ${timeString}</div>
        `;
        
        notificationsList.appendChild(notificationItem);
    });
}

// Make functions available globally for onclick handlers
window.viewAccount = viewAccount;
window.deleteAccount = deleteAccount;
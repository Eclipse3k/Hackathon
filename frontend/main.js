// Global Variables
let apiBaseUrl = 'http://localhost:3000';
let currentApiVersion = 'balances';
let monitoredAccounts = [];
let recentBalanceChanges = 0;

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
const notificationToast = document.getElementById('notification-toast');
const notificationMessage = document.getElementById('notification-message');

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    // Set API version change handler
    apiVersionSelect.addEventListener('change', function() {
        currentApiVersion = this.value;
        const webhookField = document.querySelector('.webhook-field');
        webhookField.style.display = currentApiVersion === 'balances' ? 'block' : 'none';
    });

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
    setInterval(loadAllAccounts, 30000); // Refresh every 30 seconds
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
    
    if (!accountId) {
        showNotification('Error: Account ID is required', true);
        return;
    }
    
    let body = { accountId };
    
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
            <td colspan="5" style="text-align: center; padding: 30px;">
                No accounts are being monitored. Click "Add Account" to start monitoring.
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
        
        // Create table row with account data
        row.innerHTML = `
            <td class="account-id" title="${account.accountId}">${truncateString(account.accountId, 16)}</td>
            <td>${balanceDisplay}</td>
            <td title="${account.webhook}">${truncateString(account.webhook || 'N/A', 25)}</td>
            <td>${formattedDate}</td>
            <td class="actions">
                <button class="btn-action view" onclick="viewAccount('${account.accountId}')">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn-action delete" onclick="deleteAccount('${account.accountId}')">
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
                totalBalance += account.currentBalance.balance;
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

// Make functions available globally for onclick handlers
window.viewAccount = viewAccount;
window.deleteAccount = deleteAccount;
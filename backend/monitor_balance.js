const axios = require('axios');

const QUBIC_RPC_URL = 'https://rpc.qubic.org/v1';
const ACCOUNT_ID = 'ZJFLGVZGNZSMVAAIUDHEZETOZAJDOGVATOLUDDBKLCIJFWLFKUIJBFVFBNIH';

let previousBalance = null;

// Obtener balance de la cuenta
async function getBalance() {
    try {
        const response = await axios.get(`${QUBIC_RPC_URL}/balances/${ACCOUNT_ID}`);
        return response.data.balance;
    } catch (error) {
        console.error(`❌ Error obteniendo balance de ${ACCOUNT_ID}:`, error.message);
        return null;
    }
}

// Monitorear cambios de saldo
async function monitorBalance() {
    console.log("🔍 Consultando balance...");

    const currentBalance = await getBalance();
    
    if (currentBalance === null) {
        setTimeout(monitorBalance, 5000);
        return;
    }

    if (previousBalance !== null && currentBalance.balance != previousBalance.balance) {
        console.log(`🚀 La cuenta ${ACCOUNT_ID} ha recibido ${currentBalance.balance - previousBalance.balance} unidades.`);
    }

    previousBalance = currentBalance;
    setTimeout(monitorBalance, 5000);
}

// Iniciar monitoreo
monitorBalance();

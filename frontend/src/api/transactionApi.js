
const API_URL = `${ import.meta.env.VITE_API_URL ||"http://localhost:5000"}/api/transactions`;

// Reusable function for making API requests
async function request(url, options = {}) {
    const response = await fetch(url, {
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
        ...options,
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.message || "Something went wrong"
        );
    }

    return data;
}

// GET ALL TRANSACTIONS
export async function getTransactions(month = "") {
    const query = month
        ? `?month=${encodeURIComponent(month)}`
        : "";

    return request(`${API_URL}${query}`);
}

// CREATE TRANSACTION
export async function createTransaction(transaction) {
    return request(API_URL, {
        method: "POST",
        body: JSON.stringify(transaction),
    });
}

// GET TRANSACTION SUMMARY
export async function getTransactionSummary(month = "") {
    const query = month
        ? `?month=${encodeURIComponent(month)}`
        : "";

    return request(`${API_URL}/summary${query}`);
}

// UPDATE LOAN PAYMENT STATUS
export async function updateLoanStatus(id, loanStatus) {
    return request(`${API_URL}/${id}/loan-status`, {
        method: "PATCH",
        body: JSON.stringify({ loanStatus }),
    });
}

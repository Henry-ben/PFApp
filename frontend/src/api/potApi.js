const API_URL = "http://localhost:5000/api/pots";

// Reusable function for API requests
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
        throw new Error(data.message || "Something went wrong");
    }

    return data;
}

// GET ALL POTS
export async function getPots() {
    return request(API_URL);
}

// CREATE A POT
export async function createPot(pot) {
    return request(API_URL, {
        method: "POST",
        body: JSON.stringify(pot),
    });
}

// ADD DEPOSIT TO A POT
export async function depositIntoPot(id, deposit) {
    return request(`${API_URL}/${id}/deposits`, {
        method: "POST",
        body: JSON.stringify(deposit),
    });
}

// GET POT DEPOSIT HISTORY
export async function getPotDeposits(id) {
    return request(`${API_URL}/${id}/deposits`);
}

// DELETE A POT
export async function deletePot(id) {
    return request(`${API_URL}/${id}`, {
        method: "DELETE",
    });
}

// GET ALL POT DEPOSITS
export async function getAllPotDeposits() {
    return request(`${API_URL}/deposits`);
}
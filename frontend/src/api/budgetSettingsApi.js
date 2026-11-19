
const API_URL = `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/budget-settings`;

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

// GET saved budget formation
export function getBudgetSettings() {
    return request(API_URL);
}

// UPDATE budget formation
export function updateBudgetSettings(formation) {
    return request(API_URL, {
        method: "PUT",
        body: JSON.stringify({ formation }),
    });
}

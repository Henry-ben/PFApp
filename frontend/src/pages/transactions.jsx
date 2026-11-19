
import { useState, useEffect } from "react";
import { Plus, Search, X, ArrowDownLeft, ArrowUpRight, CalendarDays, ReceiptText } from "lucide-react";
import "../css/transaction.css";
import { createTransaction, getTransactions, updateLoanStatus } from "../api/transactionApi.js";
import Skeleton from "../component/skeleton.jsx";


const emptyForm = {
    name: "",
    type: "Food",
    description: "",
    amount: "",
    direction: "Expense",
    budgetGroup: "Want",
    date: new Date().toLocaleDateString("en-CA"),
};

function Transaction({ transactions, setTransactions }) {
    const [showForm, setShowForm] = useState(false);
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("All");
    const [filterMonth, setFilterMonth] = useState("");
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [saving, setSaving] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const transactionsPerPage = 10;



    const formatMoney = (amount) =>
        new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 2,
        }).format(amount);

    const filteredTransactions = transactions.filter((transaction) => {
        const matchesSearch =
            transaction.name.toLowerCase().includes(search.toLowerCase()) ||
            transaction.description.toLowerCase().includes(search.toLowerCase());

        const matchesType =
            filterType === "All" || transaction.type === filterType;

        const matchesMonth =
            !filterMonth || transaction.date.startsWith(filterMonth);

        return matchesSearch && matchesType && matchesMonth;
    });

    // Pagination calculations
    const totalPages = Math.ceil(
        filteredTransactions.length / transactionsPerPage
    );

    const startIndex = (currentPage - 1) * transactionsPerPage;

    const paginatedTransactions = filteredTransactions.slice(
        startIndex,
        startIndex + transactionsPerPage
    );

    const totalIncome = transactions
        .filter((transaction) => transaction.direction === "Income")
        .reduce((total, transaction) => total + transaction.amount, 0);

    const totalExpenses = transactions
        .filter((transaction) => transaction.direction === "Expense")
        .reduce((total, transaction) => total + transaction.amount, 0);

    function handleChange(event) {
        const { name, value } = event.target;
        setForm((previous) => ({ ...previous, [name]: value }));
    }

    async function handleCreate(event) {
        event.preventDefault();

        if (
            !form.name.trim() ||
            !form.amount ||
            Number(form.amount) <= 0 ||
            !form.date
        ) {
            setError("Enter a name, a valid amount, and a date.");
            return;
        }

        const confirmed = window.confirm(
            "Are you sure you want to create this transaction? Transactions cannot be edited or deleted once created."
        );

        if (!confirmed) return;

        try {
            setSaving(true);
            setError("");

            const newTransaction = {
                name: form.name.trim(),
                type: form.type,
                description: form.description.trim(),
                amount: Number(form.amount),
                direction: form.direction,
                budgetGroup: form.direction === "Expense"
                ? form.budgetGroup : null,
                date: form.date,
            };

            const data = await createTransaction(newTransaction);

            // Add the saved transaction to the list
            if (
                !filterMonth ||
                data.transaction.date.startsWith(filterMonth)
            ) {
                setTransactions(previous => [
                    data.transaction,
                    ...previous
                ]);
            }

            setForm({
                ...emptyForm,
                date: new Date().toLocaleDateString("en-CA")
            });

            setShowForm(false);

        } catch (error) {
            setError(error.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleLoanStatus(id, currentStatus) {
        const newStatus = currentStatus === "Paid"
            ? "Unpaid"
            : "Paid";

        try {
            const data = await updateLoanStatus(id, newStatus);

            setTransactions(previous =>
                previous.map(transaction =>
                    transaction.id === id
                        ? data.transaction
                        : transaction
                )
            );

        } catch (error) {
            setLoadError(error.message);
        }
    }

    function closeForm() {
        setShowForm(false);
        setForm({ ...emptyForm, date: new Date().toLocaleDateString("en-CA") });
        setError("");
    }

    useEffect(() => {
        async function loadTransactions() {
            try {
                setLoading(true);
                setLoadError("");

                const data = await getTransactions(filterMonth);

                setTransactions(data.transactions || []);
            } catch (error) {
                setLoadError(error.message);
            } finally {
                setLoading(false);
            }
        }

        loadTransactions();
    }, [filterMonth, setTransactions, retryCount]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, filterType, filterMonth]);


    return (
        <section className="tx-page">
            <div className="tx-heading">
                <div>
                    <p className="tx-eyebrow">YOUR MONEY, ORGANIZED</p>
                    <h2>Transactions</h2>
                    <p className="tx-subtitle">
                        Keep track of the money coming in and going out.
                    </p>
                </div>

                <button
                    className="tx-add-btn"
                    onClick={() => setShowForm(true)}
                >
                    <Plus size={19} />
                    Add transaction
                </button>
            </div>

            <div className="tx-summary">
                <article className="tx-summary-card tx-income-card">
                    <div className="tx-summary-icon">
                        <ArrowDownLeft size={21} />
                    </div>
                    <p>Total income</p>
                    <h3> 
                         {loading ? (
                            <Skeleton width="120px" height="22px" />
                        ) : loadError ? (
                            "Unavailable"
                        ) : (
                            formatMoney(totalIncome)
                        )}
                    </h3>
                </article>

                <article className="tx-summary-card tx-expense-card">
                    <div className="tx-summary-icon">
                        <ArrowUpRight size={21} />
                    </div>
                    <p>Total expenses</p>
                    <h3>
                         {loading ? (
                            <Skeleton width="120px" height="22px" />
                        ) : loadError ? (
                            "Unavailable"
                        ) : (
                            formatMoney(totalExpenses)
               )}
                    </h3>
                </article>

                <article className="tx-summary-card tx-count-card">
                    <div className="tx-summary-icon">
                        <ReceiptText size={21} />
                    </div>
                    <p>Transactions</p>
                    <h3>
                        {loading ? (
                            <Skeleton width="120px" height="22px" />
                        ) : loadError ? (
                            "Unavailable"
                        ) : (
                            transactions.length
                        )}
                    </h3>
                </article>
            </div>

            <div className="tx-list-panel">
                <div className="tx-list-heading">
                    <div>
                        <h3>All transactions</h3>
                        <p>Review and filter your activity.</p>
                    </div>
                    <span className="tx-count-badge">
                        {filteredTransactions.length} records
                    </span>
                </div>

                <div className="tx-filters">
                    <div className="tx-search">
                        <Search size={18} />
                        <input
                            type="search"
                            placeholder="Search name or description..."
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>

                    <select
                        aria-label="Filter by transaction type"
                        value={filterType}
                        onChange={(event) => setFilterType(event.target.value)}
                    >
                        <option value="All">All types</option>
                        <option value="Food">Food</option>
                        <option value="Loan">Loan</option>
                        <option value="Subscription">Subscription</option>
                        <option value="Miscellaneous">Miscellaneous</option>
                    </select>

                    <label className="tx-month-filter">
                        <CalendarDays size={17} />
                        <input
                            type="month"
                            aria-label="Filter by month"
                            value={filterMonth}
                            onChange={(event) => setFilterMonth(event.target.value)}
                        />
                    </label>
                </div>

                <div className="tx-table-wrap">

                    {loadError && (
                        <>
                            <p className="tx-error">Unable to load transactions: {loadError}</p>

                            <button
                            type="button"
                            className="tx-retry-btn"
                            onClick={() => setRetryCount(prev => prev + 1)}
                            >
                            Retry
                            </button>
                        </>
                    )}
                    <table className="tx-table">
                        <thead>
                            <tr>
                                <th>Transaction</th>
                                <th>Category</th>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <>
                                    {Array.from({ length: 7 }).map((_, index) => (
                                        <tr key={index}>
                                            {/* Transaction */}
                                            <td>
                                                <div className="tx-person">
                                                    <Skeleton
                                                        width="38px"
                                                        height="38px"
                                                        borderRadius="50%"
                                                    />

                                                    <div>
                                                        <Skeleton width="120px" height="15px" />
                                                        <Skeleton width="90px" height="12px" />
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Category */}
                                            <td>
                                                <Skeleton
                                                    width="85px"
                                                    height="25px"
                                                    borderRadius="20px"
                                                />
                                            </td>

                                            {/* Date */}
                                            <td>
                                                <Skeleton width="85px" height="15px" />
                                            </td>

                                            {/* Amount */}
                                            <td>
                                                <Skeleton width="100px" height="17px" />
                                            </td>

                                            {/* Status */}
                                            <td>
                                                <Skeleton
                                                    width="65px"
                                                    height="25px"
                                                    borderRadius="20px"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </>
                            ) : (
                            paginatedTransactions.map((transaction) => (
                                <tr key={transaction.id}>
                                    <td>
                                        <div className="tx-person">
                                            <div className={`tx-avatar ${transaction.direction === "Income" ? "tx-avatar-income" : "tx-avatar-expense"}`}>
                                                {transaction.direction === "Income"
                                                    ? <ArrowDownLeft size={19} />
                                                    : <ArrowUpRight size={19} />}
                                            </div>
                                            <div>
                                                <strong>{transaction.name}</strong>
                                                <span>{transaction.description || transaction.type}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`tx-category tx-category-${transaction.type.toLowerCase()}`}>
                                            {transaction.type}
                                        </span>
                                    </td>
                                    <td className="tx-date">
                                        {new Date(`${transaction.date}T12:00:00`).toLocaleDateString("en-GB", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric",
                                        })}
                                    </td>
                                    <td>
                                        <strong className={`tx-amount ${transaction.direction === "Income" ? "positive" : "negative"}`}>
                                            {transaction.direction === "Income" ? "+" : "−"}
                                            {formatMoney(transaction.amount)}
                                        </strong>
                                    </td>

                                    <td>
                                        {transaction.type === "Loan" && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleLoanStatus(
                                                        transaction.id,
                                                        transaction.loanStatus
                                                    )
                                                }
                                                className={`tx-loan-status ${transaction.loanStatus === "Paid" ? "paid" : ""}`}
                                            >
                                                {transaction.loanStatus === "Paid"
                                                    ? "Paid"
                                                    : "Unpaid"}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )))}
                        </tbody>
                    </table>

                    {!loading && !loadError && filteredTransactions.length === 0 && (
                        <div className="tx-empty">
                            <ReceiptText size={30} />
                            <h4>No transactions found</h4>
                            <p>Try changing your search or filters, or add a transaction.</p>
                        </div>
                    )}
                </div>
                {/* PAGINATION */}
                {!loading && totalPages > 1 && (
                    <div className="tx-pagination">
                        {Array.from({ length: totalPages }, (_, index) => (
                            <button
                                key={index + 1}
                                type="button"
                                className={`tx-page-dot ${
                                    currentPage === index + 1 ? "active" : ""
                                }`}
                                onClick={() => setCurrentPage(index + 1)}
                                aria-label={`Go to page ${index + 1}`}
                                aria-current={currentPage === index + 1 ? "page" : undefined}
                            >
                                {index + 1}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {showForm && (
                <div className="tx-modal" onMouseDown={(event) => {
                    if (event.target === event.currentTarget) closeForm();
                }}>
                    <div
                        className="tx-modal-box"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="tx-modal-title"
                    >
                        <div className="tx-modal-heading">
                            <div>
                                <p className="tx-eyebrow">RECORD YOUR ACTIVITY</p>
                                <h3 id="tx-modal-title">Add transaction</h3>
                            </div>
                            <button
                                type="button"
                                className="tx-close-btn"
                                aria-label="Close form"
                                onClick={closeForm}
                            >
                                <X size={21} />
                            </button>
                        </div>

                        <form onSubmit={handleCreate}>
                            <div className="tx-form-grid">
                                <div className="tx-field tx-field-full">
                                    <label htmlFor="tx-name">Name</label>
                                    <input
                                        id="tx-name"
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        placeholder="Person or business name"
                                        required
                                    />
                                </div>

                                <div className="tx-field">
                                    <label htmlFor="tx-type">Category</label>
                                    <select
                                        id="tx-type"
                                        name="type"
                                        value={form.type}
                                        onChange={handleChange}
                                    >
                                        <option>Food</option>
                                        <option>Loan</option>
                                        <option>Subscription</option>
                                        <option>Miscellaneous</option>
                                    </select>
                                </div>

                                <div className="tx-field">
                                    <label htmlFor="tx-direction">Transaction type</label>
                                    <select
                                        id="tx-direction"
                                        name="direction"
                                        value={form.direction}
                                        onChange={handleChange}
                                    >
                                        <option>Expense</option>
                                        <option>Income</option>
                                    </select>
                                </div>

                                {form.direction === "Expense" && (
                                    <div className="tx-field">
                                        <label htmlFor="tx-budget-group">Budget Group</label>
                                        <select
                                            id="tx-budget-group"
                                            name="budgetGroup"
                                            value={form.budgetGroup}
                                            onChange={handleChange}
                                        >
                                            <option value="Need">Need (Essential)</option>
                                            <option value="Want">Want (Personal)</option>
                                        </select>
                                    </div>
                                )}

                                <div className="tx-field tx-field-full">
                                    <label htmlFor="tx-description">Description</label>
                                    <textarea
                                        id="tx-description"
                                        name="description"
                                        value={form.description}
                                        onChange={handleChange}
                                        placeholder="What was this transaction for?"
                                        rows={3}
                                    />
                                </div>

                                <div className="tx-field">
                                    <label htmlFor="tx-amount">Amount (₦)</label>
                                    <input
                                        id="tx-amount"
                                        name="amount"
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        value={form.amount}
                                        onChange={handleChange}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>

                                <div className="tx-field">
                                    <label htmlFor="tx-date">Date</label>
                                    <input
                                        id="tx-date"
                                        name="date"
                                        type="date"
                                        value={form.date}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>

                            </div>

                            {error && <p className="tx-error">{error}</p>}

                            <div className="tx-form-actions">
                                <button
                                    type="button"
                                    className="tx-cancel-btn"
                                    onClick={closeForm}
                                >
                                    Cancel
                                </button>
                                <button type="submit" className="tx-add-btn"
                                disabled={saving}>
                                    <Plus size={18} />
                                    {saving ? "Saving..." : "Create transaction"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </section>
    );
}

export default Transaction;

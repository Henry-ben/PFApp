
import { useMemo, useState, useEffect } from "react";
import {
  Search,
  CalendarDays,
  Repeat,
  Utensils,
  HandCoins,
  CreditCard,
  CheckCircle2,
  Clock3,
  Receipt,
} from "lucide-react";
import "../css/recurringBills.css";
import Skeleton from "../component/skeleton.jsx";
import {getTransactions} from "../api/transactionApi.js";

const categories = [
  { name: "All Transactions", icon: Receipt },
  { name: "Food", icon: Utensils },
  { name: "Loan", icon: HandCoins },
  { name: "Subscription", icon: CreditCard },
  { name: "Miscellaneous", icon: Repeat },
];

const formatMoney = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(amount);

const formatDate = (date) => {
  if (!date) return "Not set";

  return new Date(`${date}T12:00:00`).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

function Bills({ transactions, setTransactions }) {
  const [activeCategory, setActiveCategory] = useState("All Transactions");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const transactionsPerPage = 10;

  useEffect(() => {
      async function loadTransactions() {
          try {
              setLoading(true);
              setLoadError("");

              const data = await getTransactions();

              setTransactions(data.transactions || []);
          } catch (error) {
              console.error("Failed to load transactions:", error);
              setLoadError(error.message);
          } finally {
              setLoading(false);
          }
      }

      loadTransactions();
  }, [setTransactions, retryCount]);

  // All transaction amounts
  const totalAmount = transactions.reduce(
    (sum, transaction) => sum + Number(transaction.amount),
    0
  );

  // Only loan transactions count toward these payment summaries
  const loans = transactions.filter(
    (transaction) => transaction.type === "Loan"
  );

  const paidLoans = loans.filter(
    (transaction) => transaction.loanStatus === "Paid"
  );

  const unpaidLoans = loans.filter(
    (transaction) => transaction.loanStatus !== "Paid"
  );

  const paidAmount = paidLoans.reduce(
    (sum, transaction) => sum + Number(transaction.amount),
    0
  );

  const unpaidAmount = unpaidLoans.reduce(
    (sum, transaction) => sum + Number(transaction.amount),
    0
  );

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesCategory =
        activeCategory === "All Transactions" ||
        transaction.type === activeCategory;

      const searchTerm = search.toLowerCase();

      const matchesSearch =
        transaction.name.toLowerCase().includes(searchTerm) ||
        (transaction.description || "").toLowerCase().includes(searchTerm) ||
        transaction.type.toLowerCase().includes(searchTerm);

      return matchesCategory && matchesSearch;
    });
  }, [transactions, activeCategory, search]);

  // Pagination calculations
  const totalPages = Math.ceil(
      filteredTransactions.length / transactionsPerPage
  );

  const startIndex = (currentPage - 1) * transactionsPerPage;

  const paginatedTransactions = filteredTransactions.slice(
      startIndex,
      startIndex + transactionsPerPage
  );

  function toggleLoanStatus(id) {
    const loan = transactions.find(
      (transaction) =>
        transaction.id === id && transaction.type === "Loan"
    );

    if (!loan) return;

    const newStatus =
      loan.loanStatus === "Paid" ? "Unpaid" : "Paid";

    setTransactions((current) =>
      current.map((transaction) =>
        transaction.id === id
          ? { ...transaction, loanStatus: newStatus }
          : transaction
      )
    );

    setNotice(`${loan.name} marked as ${newStatus.toLowerCase()}.`);
  }

  return (
    <div className="recurring-page">
      <header className="recurring-header">
        <div>
          <span className="recurring-eyebrow">
            YOUR MONEY, ORGANIZED
          </span>
          <h2>Transactions Overview</h2>
          <p>
            View your transactions by category and track loan payments.
          </p>
        </div>
      </header>

      {notice && (
        <div className="recurring-notice" role="status">
          <CheckCircle2 size={19} />
          <span>{notice}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </div>
      )}

      <section className="recurring-summary">
        <article className="recurring-total-card">
          <span className="recurring-summary-icon">
            <Receipt size={22} />
          </span>
          <p>Total transaction amount</p>
          <h2>
              {loading ? (
                  <Skeleton width="130px" height="28px" />
              ) : loadError ? (
                  "Unavailable"
              ) : (
                  formatMoney(totalAmount)
              )}
          </h2>
          <span className="recurring-summary-note">
            {transactions.length} transactions
          </span>
        </article>

        <article className="recurring-paid-card">
          <span className="recurring-summary-icon">
            <CheckCircle2 size={22} />
          </span>
          <p>Loans paid</p>
          <h2>
              {loading ? (
                  <Skeleton width="130px" height="28px" />
              ) : loadError ? (
                  "Unavailable"
              ) : (
                  formatMoney(paidAmount)
              )}
          </h2>
          <span className="recurring-summary-note">
            {paidLoans.length} paid loans
          </span>
        </article>

        <article className="recurring-upcoming-card">
          <span className="recurring-summary-icon">
            <Clock3 size={22} />
          </span>
          <p>Loans unpaid</p>
          <h2>
            {loading ? (
              <Skeleton width="130px" height="28px" />
            ) : loadError ? (
              "Unavailable"
            ) : (
              formatMoney(unpaidAmount)
            )}
          </h2>
          <span className="recurring-summary-note">
            {unpaidLoans.length} unpaid loans
          </span>
        </article>
      </section>

      <section className="recurring-category-section">
        <div className="recurring-section-heading">
          <div>
            <h3>Categories</h3>
            <p>Choose a category to filter your transactions.</p>
          </div>
        </div>

        <div className="recurring-categories">
          {categories.map((category) => {
            const Icon = category.icon;

            const count =
              category.name === "All Transactions"
                ? transactions.length
                : transactions.filter(
                    (transaction) => transaction.type === category.name
                  ).length;

            return (
              <button
                type="button"
                key={category.name}
                className={`recurring-category ${
                  activeCategory === category.name ? "active" : ""
                }`}
                onClick={() => {
                  setActiveCategory(category.name);
                  setCurrentPage(1);
                }
                }
              >
                <span className="recurring-category-icon">
                  <Icon size={20} />
                </span>

                <span className="recurring-category-name">
                  {category.name}
                </span>

                <span className="recurring-category-count">{count}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="recurring-list-section">
        <div className="recurring-list-heading">
          <div>
            <h3>{activeCategory}</h3>
            <p>{filteredTransactions.length} transactions found</p>
          </div>

          <label className="recurring-search">
            <Search size={18} />
            <input
              type="search"
              placeholder="Search transactions..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setCurrentPage(1);
              }}
            />
          </label>
        </div>

        {loading ? (
          <div className="recurring-bill-list">
              {Array.from({ length: 5 }).map((_, index) => (
                  <div className="recurring-bill-card" key={index}>
                      <div className="recurring-bill-info">
                          <Skeleton width="140px" height="18px" />
                          <Skeleton width="100px" height="14px" />
                      </div>

                      <Skeleton width="90px" height="20px" />
                  </div>
              ))}
          </div>
      ) : loadError ? (
         <div className="recurring-empty">
              <Receipt size={34} />
              <h4>Unable to load transactions</h4>
              <p>{loadError}</p>

              <button
                  type="button"
                  className="recurring-retry-btn"
                  onClick={() => setRetryCount(prev => prev + 1)}
              >
                  Try Again
              </button>
          </div>
      ) : paginatedTransactions.length === 0 ? (
          <div className="recurring-empty">
            <Receipt size={34} />
            <h4>No transactions found</h4>
            <p>
              Transactions added on the Transactions page will appear here.
            </p>
          </div>
        ) : (
          <div className="recurring-bill-list">
            {paginatedTransactions.map((transaction) => {
              const category = categories.find(
                (item) => item.name === transaction.type
              );

              const Icon = category?.icon || Receipt;
              const isLoan = transaction.type === "Loan";
              const isPaid = transaction.loanStatus === "Paid";

              return (
                <article
                  className="recurring-bill-row"
                  key={transaction.id}
                >
                  <span
                    className={`recurring-bill-icon recurring-icon-${transaction.type
                      .toLowerCase()
                      .replaceAll(" ", "-")}`}
                  >
                    <Icon size={21} />
                  </span>

                  <div className="recurring-bill-main">
                    <h4>{transaction.name}</h4>
                    <p>{transaction.description || transaction.type}</p>
                    <span className="recurring-bill-category">
                      {transaction.type}
                    </span>
                  </div>

                  <div className="recurring-bill-date">
                    <span>Transaction date</span>
                    <strong>{formatDate(transaction.date)}</strong>
                    <small>
                      <CalendarDays size={13} />
                      {transaction.direction}
                    </small>
                  </div>

                  <div className="recurring-bill-amount">
                    <strong>
                      {transaction.direction === "Income" ? "+" : "−"}
                      {formatMoney(Number(transaction.amount))}
                    </strong>

                    {isLoan ? (
                      <span
                        className={
                          isPaid ? "status-paid" : "status-pending"
                        }
                      >
                        {isPaid ? "Paid" : "Unpaid"}
                      </span>
                    ) : (
                      <span className="recurring-bill-category">
                        Recorded
                      </span>
                    )}
                  </div>

                  {isLoan && (
                    <button
                      type="button"
                      className={`recurring-mark-button ${
                        isPaid ? "is-paid" : ""
                      }`}
                      onClick={() => toggleLoanStatus(transaction.id)}
                    >
                      {isPaid ? "Mark unpaid" : "Mark paid"}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
        {/* PAGINATION */}
        {!loading && totalPages > 1 && (
            <div className="recurring-pagination">
                {Array.from({ length: totalPages }, (_, index) => (
                    <button
                        key={index + 1}
                        type="button"
                        className={`recurring-page-dot ${
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
      </section>

      <footer className="recurring-footer-note">
        <span className="recurring-footer-icon">
          <CalendarDays size={22} />
        </span>
        <div>
          <strong>Everything in one place</strong>
          <p>
            New transactions appear here automatically. Use the category
            filters to review your activity and update loan payment status.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Bills;

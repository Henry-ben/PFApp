
import { useState, useEffect } from "react";
import {
    Wallet,
    PiggyBank,
    House,
    ShoppingBasket,
    Zap,
    CreditCard,
    CircleDollarSign,
} from "lucide-react";
import "../css/budget.css";
import Skeleton from "../component/skeleton.jsx";
import { getTransactions } from "../api/transactionApi.js";
import { getAllPotDeposits } from "../api/potApi.js";
import { getBudgetSettings, updateBudgetSettings } from "../api/budgetSettingsApi.js";


const initialExpenses = [
    { id: 1, name: "Rent", amount: 0, group: "Want", icon: House },
    { id: 2, name: "Food", amount: 0, group: "Need", icon: ShoppingBasket },
    { id: 3, name: "Electricity", amount: 0, group: "Need", icon: Zap },
    { id: 4, name: "Subscriptions", amount: 0, group: "Want", icon: CreditCard },
    { id: 5, name: "Personal spending", amount: 0, group: "Want", icon: Wallet },
];

function Budget() {
    const [formation, setFormation] = useState("5-3-2");
    const [formationLoading, setFormationLoading] = useState(true);
    const [formationError, setFormationError] = useState("");
    const [period, setPeriod] = useState("Monthly");
    const [expenses, setExpenses] = useState(initialExpenses);
    const [editing, setEditing] = useState(false);

    const today = new Date();

    const [selectedMonth, setSelectedMonth] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`);

    const [transactions, setTransactions] = useState([]);
    const [deposits, setDeposits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dataError, setDataError] = useState("");
    const [retryCount, setRetryCount] = useState(0);

    useEffect(() => {
        async function fetchFormation() {
            try {
                setFormationLoading(true);
                setFormationError("");

                const data = await getBudgetSettings();

                setFormation(data.formation);
            } catch (error) {
                console.error("Budget formation error:", error.message);
                setFormationError(error.message);
            } finally {
                setFormationLoading(false);
            }
        }

        fetchFormation();
    }, []);

    useEffect(() => {
        async function fetchBudgetData() {
            try {
                setLoading(true);
                setDataError("");

                const [transactionData, depositData] = await Promise.all([
                    getTransactions(selectedMonth),
                    getAllPotDeposits()
                ]);

                setTransactions(transactionData.transactions || []);
                setDeposits(depositData.deposits || []);

            } catch (error) {
                console.error("Budget data error:", error.message);
                setDataError(error.message);

            } finally {
                setLoading(false);
            }
        }

        fetchBudgetData();
    }, [selectedMonth, retryCount]);

    const formatMoney = (amount) =>
        new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 0,
        }).format(amount);

   
    const monthlyTransactions = transactions.filter(
        (transaction) => transaction.date?.startsWith(selectedMonth)
    );

    const totalIncome = monthlyTransactions
        .filter((transaction) => transaction.direction === "Income")
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    const percentages =
        formation === "5-3-2"
            ? { needs: 50, wants: 30, savings: 20 }
            : { needs: 40, wants: 30, savings: 30 };

    const needsLimit = totalIncome * percentages.needs / 100;
    const wantsLimit = totalIncome * percentages.wants / 100;
    const savingsLimit = totalIncome * percentages.savings / 100;

    // Actual expenses for the selected month
    const monthlyExpenses = monthlyTransactions.filter(
        (transaction) => transaction.direction === "Expense"
    );

    const needsSpent = monthlyExpenses
        .filter((transaction) => transaction.budgetGroup === "Need")
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    const wantsSpent = monthlyExpenses
        .filter((transaction) => transaction.budgetGroup === "Want")
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    // Actual pot deposits for the selected month
    const totalSavings = deposits
        .filter((deposit) => deposit.createdAt?.startsWith(selectedMonth))
        .reduce((sum, deposit) => sum + Number(deposit.amount || 0), 0);

    const totalExpenses = monthlyExpenses.reduce(
        (sum, transaction) => sum + Number(transaction.amount || 0),
        0
    );

    // Money remaining after actual expenses and pot deposits
    const remaining = totalIncome - totalExpenses - totalSavings;

    const totalPlannedExpenses = expenses.reduce(
        (sum, expense) => sum + (Number(expense.amount) || 0),
        0
    );


    const updateExpense = (id, value) => {
        setExpenses((previous) =>
            previous.map((expense) =>
                expense.id === id
                    ? { ...expense, amount: value }
                    : expense
            )
        );
    };

    const handleFormationChange = async (event) => {
        const newFormation = event.target.value;

        try {
            setFormationError("");

            const data = await updateBudgetSettings(newFormation);

            setFormation(data.settings.formation);
        } catch (error) {
            console.error("Update formation error:", error.message);
            setFormationError(error.message);
        }
    };


    return (
        <section className="budget-page">
            <header className="budget-heading">
                <div>
                    <p className="budget-eyebrow">PLAN WITH PURPOSE</p>
                    <h2>My Budget</h2>
                    <p className="budget-subtitle">
                        Give every naira a purpose and stay in control of your money.
                    </p>
                </div>

                <div className="budget-month-selector">
                    <label htmlFor="budget-month">Select month</label>
                    <input
                        type="month"
                        id="budget-month"
                        value={selectedMonth}
                        onChange={(event) => setSelectedMonth(event.target.value)}
                    />
                </div>
            </header>

            {dataError && (
                <>
                    <p className="budget-error">
                        Unable to load budget data: {dataError}
                    </p>

                    <button
                        type="button"
                        className="budget-retry-btn"
                        onClick={() => setRetryCount(prev => prev + 1)}
                    >
                        Try Again
                    </button>
                </>
            )}

            <section className="budget-hero">
                <div className="budget-hero-copy">
                    <div className="budget-hero-icon">
                        <CircleDollarSign size={24} />
                    </div>
                    <p>Monthly income</p>

                    <h3>
                        {loading ? (
                            <Skeleton width="150px" height="28px" />
                        ) : dataError ? ("Unavailable") : (
                            formatMoney(totalIncome)
                        )}
                    </h3>

                    <span className="budget-hero-note">
                        {period} budget plan
                    </span>
                </div>

                <div className="budget-hero-result">
                    <span>Money remaining</span>
                    <h3 className={remaining < 0 ? "budget-over" : ""}>
                        {loading ? (
                            <Skeleton width="150px" height="28px" />
                        ) : dataError ? ("Unavailable") : (
                            formatMoney(remaining)
                        )}
                    </h3>
                    <p>
                        {remaining < 0
                            ? "Your actual expenses and savings exceed your income."
                            : "Income remaining after actual expenses and pot deposits."
                        }
                    </p>
                </div>
            </section>

            <section className="budget-plan-panel">
                <div className="budget-panel-heading">
                    <div>
                        <h3>Budget formation</h3>
                        <p>Choose how to divide your income.</p>
                    </div>

                    <select
                        value={formation}
                        onChange={handleFormationChange}
                        aria-label="Budget formation"
                        disabled={formationLoading}
                    >
                        <option value="5-3-2">50 / 30 / 20</option>
                        <option value="4-3-3">40 / 30 / 30</option>
                    </select>
                </div>

                {formationError && (
                    <p className="budget-error">
                        Unable to save or load budget formation: {formationError}
                    </p>
                )}

                <div className="budget-allocation">
                    <article className="allocation-card needs-allocation">
                        <div className="allocation-top">
                            <span className="allocation-icon">
                                <House size={19} />
                            </span>
                            <span className="allocation-percent">
                                {percentages.needs}%
                            </span>
                        </div>
                        <p>Needs</p>
                        <h4>
                            {loading ? <Skeleton width="130px" height="22px" /> : dataError ? ("Unavailable") : formatMoney(needsLimit)}
                        </h4>
                        <span>
                            {loading ? <Skeleton width="150px" height="14px" /> : dataError ? ("Unavailable") : `Spent: ${formatMoney(needsSpent)}`}
                        </span>
                        <span>
                            {loading ? <Skeleton width="170px" height="14px" /> : dataError ? ("Unavailable") : `Remaining: ${formatMoney(needsLimit - needsSpent)}`}
                        </span>
                    </article>

                    <article className="allocation-card wants-allocation">
                        <div className="allocation-top">
                            <span className="allocation-icon">
                                <Wallet size={19} />
                            </span>
                            <span className="allocation-percent">
                                {percentages.wants}%
                            </span>
                        </div>
                        <p>Wants</p>
                        <h4>
                            {loading ? <Skeleton width="130px" height="22px" /> : dataError ? ("Unavailable") : formatMoney(wantsLimit)}
                        </h4>
                        <span>
                            {loading ? <Skeleton width="150px" height="14px" /> : dataError ? ("Unavailable") : `Spent: ${formatMoney(wantsSpent)}`}
                        </span>
                        <span>
                            {loading ? <Skeleton width="170px" height="14px" /> : dataError ? ("Unavailable") : `Remaining: ${formatMoney(wantsLimit - wantsSpent)}`}
                        </span>
                    </article>

                    <article className="allocation-card savings-allocation">
                        <div className="allocation-top">
                            <span className="allocation-icon">
                                <PiggyBank size={19} />
                            </span>
                            <span className="allocation-percent">
                                {percentages.savings}%
                            </span>
                        </div>
                        <p>Save</p>
                        <h4>
                            {loading ? <Skeleton width="130px" height="22px" /> : dataError ? ("Unavailable") : formatMoney(savingsLimit)}
                        </h4>
                        <span>
                            {loading ? <Skeleton width="150px" height="14px" /> : dataError ? ("Unavailable") : `Deposited: ${formatMoney(totalSavings)}`}
                        </span>
                        <span>
                            {loading ? <Skeleton width="170px" height="14px" /> : dataError ? ("Unavailable") : `Remaining: ${formatMoney(savingsLimit - totalSavings)}`}
                        </span>
                    </article>
                </div>

                <div className="budget-allocation-bar" aria-label="Income allocation">
                    <span style={{ width: `${percentages.needs}%` }} />
                    <span style={{ width: `${percentages.wants}%` }} />
                    <span style={{ width: `${percentages.savings}%` }} />
                </div>

                <div className="budget-bar-legend">
                    <span><i className="legend-needs" /> Needs</span>
                    <span><i className="legend-wants" /> Wants</span>
                    <span><i className="legend-savings" /> Savings</span>
                </div>
            </section>

            <div className="budget-details-grid">
                <section className="budget-expenses-panel">
                    <div className="budget-panel-heading">
                        <div>
                            <h3>Planned expenses</h3>
                            <p>Enter how much you plan to spend.</p>
                        </div>
                        <span className="budget-total-tag">
                            {loading ? (
                                <Skeleton width="120px" height="20px" />
                            ) : (
                                formatMoney(totalPlannedExpenses)
                            )}
                        </span>
                    </div>

                    <div className="budget-expense-list">
                        {expenses.map((expense) => {
                            const Icon = expense.icon;

                            return (
                                <div className="budget-expense-row" key={expense.id}>
                                    <div className={`expense-icon expense-${expense.group.toLowerCase()}`}>
                                        <Icon size={19} />
                                    </div>

                                    <div className="expense-name">
                                        <strong>{expense.name}</strong>
                                        <span>{expense.group}</span>
                                    </div>

                                    <label className="expense-amount">
                                        <span>₦</span>
                                        <input
                                            type="number"
                                            min="0"
                                            value={expense.amount}
                                            onChange={(event) =>
                                                updateExpense(expense.id, event.target.value)
                                            }
                                            aria-label={`${expense.name} amount`}
                                        />
                                    </label>
                                </div>
                            );
                        })}
                    </div>

                    <div className="budget-expense-footer">
                        <span>Total planned expenses</span>
                        <strong>
                            {loading ? (
                                <Skeleton width="120px" height="20px" />
                            ) : (
                                formatMoney(totalPlannedExpenses)
                            )}
                        </strong>
                    </div>
                </section>

            </div>
        </section>
    );
}

export default Budget;

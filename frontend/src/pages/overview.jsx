import {useState, useEffect} from 'react'
import { Wallet, ChevronRight,PiggyBank,CircleDollarSign} from 'lucide-react'
import "../css/overview.css"
import {getTransactionSummary, getTransactions} from "../api/transactionApi.js"
import Skeleton from '../component/skeleton.jsx'
import {getPots, getAllPotDeposits} from "../api/potApi.js"
import { getBudgetSettings } from '../api/budgetSettingsApi.js'



function OverView({setActivePage}) { 

    const [summary, setSummary] = useState({
        totalIncome: 0,
        totalExpenses: 0,
        balance: 0,
        transactionCount: 0
    });

    const [loading, setLoading] = useState(true);
    const [summaryError, setSummaryError] = useState("");
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [transactionsLoading, setTransactionsLoading] = useState(true);
    const [transactionsError, setTransactionsError] = useState("");
    const [pots, setPots] = useState([]);
    const [potsLoading, setPotsLoading] = useState(true);
    const [potsError, setPotsError] = useState("");
    const [budgetTransactions, setBudgetTransactions] = useState([]);
    const [budgetDeposits, setBudgetDeposits] = useState([]);
    const [budgetFormation, setBudgetFormation] = useState("5-3-2");
    const [budgetLoading, setBudgetLoading] = useState(true);
    const [budgetError, setBudgetError] = useState("");

    useEffect(() => {
        async function loadSummary() {
            try {
                setLoading(true);
                setSummaryError("");

                const data = await getTransactionSummary();

                setSummary(data);
            } catch (error) {
                setSummaryError(error.message);
            } finally {
                setLoading(false);
            }
        }

        loadSummary();
    }, []);
    useEffect(() => {
        async function loadRecentTransactions() {
            try {
                setTransactionsLoading(true);
                setTransactionsError("");

                const data = await getTransactions();

                setRecentTransactions(data.transactions.slice(0, 5));
            } catch (error) {
                setTransactionsError(error.message);
            } finally {
                setTransactionsLoading(false);
            }
        }

        loadRecentTransactions();
    }, []);
    useEffect(() => {
        async function loadPots() {
            try {
                setPotsLoading(true);
                setPotsError("");

                const data = await getPots();

                setPots(data.pots);
            } catch (error) {
                setPotsError(error.message);
            } finally {
                setPotsLoading(false);
            }
        }

        loadPots();
    }, []);

    useEffect(() => {
        async function loadBudgetData() {
            try {
                setBudgetLoading(true);
                setBudgetError("");

                const [transactionData, depositData, settingsData] =
                    await Promise.all([
                        getTransactions(),
                        getAllPotDeposits(),
                        getBudgetSettings()
                    ]);

                setBudgetTransactions(transactionData.transactions || []);
                setBudgetDeposits(depositData.deposits || []);
                setBudgetFormation(settingsData.formation);

            } catch (error) {
                console.error("Overview budget error:", error.message);
                setBudgetError(error.message);
            } finally {
                setBudgetLoading(false);
            }
        }

        loadBudgetData();
    }, []);


   const totalSaved = pots.reduce((total, pot) => total + (pot.saved || 0), 0);

   // Current month
    const today = new Date();

    const currentMonth = `${today.getFullYear()}-${String(
        today.getMonth() + 1
    ).padStart(2, "0")}`;

    // Transactions for the current month
    const monthlyTransactions = budgetTransactions.filter(
        transaction => transaction.date?.startsWith(currentMonth)
    );

    // Monthly income
    const totalIncome = monthlyTransactions
        .filter(transaction => transaction.direction === "Income")
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    // Budget percentages
    const percentages = budgetFormation === "5-3-2"
        ? { needs: 50, wants: 30, savings: 20 }
        : { needs: 40, wants: 30, savings: 30 };

    // Allocation limits
    const needsLimit = totalIncome * percentages.needs / 100;
    const wantsLimit = totalIncome * percentages.wants / 100;
    const savingsLimit = totalIncome * percentages.savings / 100;

    // Actual monthly expenses
    const monthlyExpenses = monthlyTransactions.filter(
        transaction => transaction.direction === "Expense"
    );

    const needsSpent = monthlyExpenses
        .filter(transaction => transaction.budgetGroup === "Need")
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    const wantsSpent = monthlyExpenses
        .filter(transaction => transaction.budgetGroup === "Want")
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

    // Total expenses, including expenses without a budget group
    const totalSpent = monthlyExpenses.reduce(
        (sum, transaction) => sum + Number(transaction.amount || 0),
        0
    );

    // Actual monthly Pot deposits
    const savingsDeposited = budgetDeposits
        .filter(deposit => deposit.createdAt?.startsWith(currentMonth))
        .reduce((sum, deposit) => sum + Number(deposit.amount || 0), 0);
    
    
    // Current month's transaction count
    const monthlyTransactionCount = monthlyTransactions.length;

    // Current month's loan transactions
    const monthlyLoans = monthlyTransactions.filter(
        transaction => transaction.type === "Loan"
    );

    // Paid loans
    const monthlyPaidLoans = monthlyLoans.filter(
        transaction => transaction.loanStatus === "Paid"
    );

    const paidLoansAmount = monthlyPaidLoans.reduce(
        (sum, transaction) => sum + Number(transaction.amount || 0),
        0
    );

    // Unpaid loans
    const monthlyUnpaidLoans = monthlyLoans.filter(
        transaction => transaction.loanStatus !== "Paid"
    );

    const unpaidLoansAmount = monthlyUnpaidLoans.reduce(
        (sum, transaction) => sum + Number(transaction.amount || 0),
        0
    );

    // Five most recent transactions
    const recentBillTransactions = [...monthlyTransactions]
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);

    const formatMoney = (amount) =>
        new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 2,
        }).format(Number(amount));





    return (
        <>
            

                <section className="summary-grid">

                    <article className='summary-card balance-card'>
                        <p>Current Balance</p>
                        <h2>{loading ? (<Skeleton width="170px" height="28px" />) : summaryError ?("Unavailable") : (formatMoney(summary.balance))}</h2>
                    </article>

                    <article className='summary-card'>
                        <p>Income</p>
                        <h2>{loading ? (<Skeleton width="150px" height="28px" />) : summaryError ?("Unavailable") : (formatMoney(summary.totalIncome))}</h2>
                    </article>

                    <article className='summary-card'>
                        <p>Expenses</p>
                        <h2>{loading ? (<Skeleton width="150px" height="28px" />) : summaryError ?("Unavailable") : (formatMoney(summary.totalExpenses))}</h2>
                    </article>

                    {summaryError && (
                        <p className="tx-error">Unable to load your financial summary: {summaryError}</p>
                    )}

                </section>

                <section className="dashboard-grid">

                    {/* LEFT COLUMN */}
                    <div className="dashboard-left">

                        {/* POTS */}
                        <article className="panel pots-panel">

                            <div className="panel-header">
                                <h3>Pots</h3>

                                <button
                                    className="details-btn"
                                    onClick={() => setActivePage("Pots")}
                                >
                                    See Details
                                    <ChevronRight size={17} />
                                </button>
                            </div>

                            <div className="pots-content">

                                <div className="total-saved">
                                    <PiggyBank size={29} />
                                    <div>
                                        <p>Total Saved</p>
                                        <h2>{potsLoading ? (<Skeleton width="150px" height="26px" />) : potsError ?("Unavailable")   : (formatMoney(totalSaved))}</h2>
                                    </div>
                                </div>

                                <div className="pot-list">

                                    {potsLoading ? (
                                        <> 
                                          {[1,2,3,4].map((item) => (
                                            <div className="pot-item" key={item}>
                                                <Skeleton width="65%" height="15px" />
                                                <Skeleton width="35%" height="15px" />
                                            </div>
                                          ))}
                                        </>
                                    ) : potsError ? (
                                        <p className="tx-error">{potsError}</p>
                                    ) : pots.length === 0 ? (
                                        <p>No pots yet.</p>
                                    ) : (
                                        pots.slice(0, 4).map((pot) => (
                                            <div className={`pot-item ${pot.color}`} key={pot.id}>
                                                <p>{pot.name}</p>
                                                <strong>{formatMoney(pot.saved)}</strong>
                                            </div>
                                        ))
                                    )}

                                </div>
                            </div>
                        </article>

                        {/* TRANSACTIONS */}
                        <article className="panel transactions-panel">

                            <div className="panel-header">
                                <h3>Transactions</h3>

                                <button
                                    className="details-btn"
                                    onClick={() =>
                                        setActivePage("Transactions")
                                    }
                                >
                                    View All
                                    <ChevronRight size={17} />
                                </button>
                            </div>

                            <div className="transaction-list">

                                {transactionsLoading ?(
                                    <>
                                        {[1, 2, 3, 4, 5].map((item) => (
                                            <div className="transaction-item" key={item}>
                                                <div className="transaction-avatar">
                                                    <Skeleton
                                                        width="38px"
                                                        height="38px"
                                                        borderRadius="50%"
                                                    />
                                                </div>

                                                <div className="transaction-info">
                                                    <Skeleton width="120px" height="15px" />
                                                    <Skeleton width="85px" height="12px" />
                                                </div>

                                                <div className="transaction-amount">
                                                    <Skeleton width="90px" height="17px" />
                                                </div>
                                            </div>
                                        ))}
                                    </>
                                ) : transactionsError ?( <p className= "tx-error">Unable to load transactions: {transactionsError}</p>
                                ) : recentTransactions.length === 0 ?(  <p>No transactions yet.</p> ) : ( recentTransactions.map((transaction, index) => (
                                    <div
                                        className="transaction-item"
                                        key={transaction.name}
                                    >
                                        <div
                                            className={`transaction-avatar avatar-${index}`}
                                        >
                                            {transaction.name
                                                .split(" ")
                                                .map(word => word[0])
                                                .join("")
                                                .slice(0, 2)
                                                .toUpperCase()
                                            }
                                        </div>

                                        <div className="transaction-info">
                                            <strong>{transaction.name}</strong>
                                            <span>{transaction.date ? transaction.date.split("-").reverse().join("/") : "No Date"}</span>
                                        </div>

                                        <strong
                                            className={`transaction-amount ${
                                                transaction.direction === "Income"
                                                    ? "positive"
                                                    : "negative"
                                            }`}
                                        >
                                            {transaction.direction === "Income"
                                                ? "+"
                                                : "-"}
                                            {formatMoney(
                                                transaction.amount
                                            )}
                                        </strong>
                                    </div>
                                )))}

                            </div>
                        </article>

                    </div>

                    {/* RIGHT COLUMN */}
                    <div className="dashboard-right">

                        {/* BUDGETS */}
                        <article className="panel budgets-panel">

                            <div className="panel-header">
                                <h3>Budgets</h3>

                                <button
                                    className="details-btn"
                                    onClick={() => setActivePage("Budgets")}
                                >
                                    See Details
                                    <ChevronRight size={17} />
                                </button>
                            </div>

                            <div className="budget-content">

                                <div className="donut-area">
                                    <div
                                        className="donut-chart"
                                        style={{
                                            background: `conic-gradient(
                                                var(--teal) 0% ${percentages.needs}%,
                                                var(--blue) ${percentages.needs}% ${percentages.needs + percentages.wants}%,
                                                var(--peach) ${percentages.needs + percentages.wants}% 100%
                                            )`
                                        }}
                                    >
                                        <div className="donut-center">
                                            <h2>
                                                {budgetLoading ? (<Skeleton width="100px" height="22px" />) : budgetError ? ("Unavailable") : (formatMoney(totalSpent))}
                                            </h2>
                                            <p>Total Spent</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="budget-legend">
                                    {budgetLoading ? (
                                        <>
                                            {[1, 2, 3].map((item) => (
                                                <div className="legend-item" key={item}>
                                                    <Skeleton width="65px" height="14px" />
                                                    <Skeleton width="145px" height="16px" />
                                                </div>
                                            ))}
                                        </>
                                    ) : budgetError ? (
                                        <p className="tx-error">{budgetError}</p>
                                    ) : (
                                        <>
                                            <div className="legend-item teal">
                                                <p>Needs</p>
                                                <strong>
                                                    {formatMoney(needsSpent)} / {formatMoney(needsLimit)}
                                                </strong>
                                            </div>

                                            <div className="legend-item blue">
                                                <p>Wants</p>
                                                <strong>
                                                    {formatMoney(wantsSpent)} / {formatMoney(wantsLimit)}
                                                </strong>
                                            </div>

                                            <div className="legend-item peach">
                                                <p>Savings</p>
                                                <strong>
                                                    {formatMoney(savingsDeposited)} / {formatMoney(savingsLimit)}
                                                </strong>
                                            </div>
                                        </>
                                    )}
                                </div>

                            </div>
                        </article>

                       {/* RECURRING BILLS */}
                        <article className="panel bills-panel">

                            <div className="panel-header">
                                <h3>Recurring Bills</h3>

                                <button
                                    className="details-btn"
                                    onClick={() => setActivePage("Recurring Bills")}
                                >
                                    See Details
                                    <ChevronRight size={17} />
                                </button>
                            </div>

                            <div className="bill-list">
                                {budgetLoading ? (
                                    <>
                                        {[1, 2, 3].map((item) => (
                                            <div className="bill-item" key={item}>
                                                <Skeleton width="110px" height="15px" />
                                                <Skeleton width="90px" height="17px" />
                                            </div>
                                        ))}
                                    </>
                                ) : budgetError ? (
                                    <p className="tx-error">{budgetError}</p>
                                ) : (
                                    <>
                                        <div className="bill-item teal">
                                            <span>Paid loan</span>
                                            <strong>{formatMoney(paidLoansAmount)}</strong>
                                        </div>

                                        <div className="bill-item peach">
                                            <span>Loan due</span>
                                            <strong>{formatMoney(unpaidLoansAmount)}</strong>
                                        </div>

                                        <div className="bill-item blue">
                                            <span>Transaction done</span>
                                            <strong>{monthlyTransactionCount}</strong>
                                        </div>
                                    </>
                                )}
                            </div>

                        </article>

                    </div>

                </section>
        </>
    )
    
}

export default OverView
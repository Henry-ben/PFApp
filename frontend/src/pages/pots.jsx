
import React, { useMemo, useState, useEffect } from "react";
import {
  PiggyBank,
  ShieldCheck,
  Plane,
  Laptop,
  Plus,
  MoreVertical,
  CalendarDays,
  Wallet,
  X,
  CheckCircle2,
  ArrowUpRight,
  Coins,
  Lightbulb,
} from "lucide-react";
import "../css/saves.css";
import Skeleton from "../component/skeleton.jsx";
import {getPots, createPot,getPotDeposits, depositIntoPot, deletePot as deletePotFromAPI} from "../api/potApi"


const formatMoney = (amount) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(amount);

const priorityWeight = {
  High: 3,
  Medium: 2,
  Low: 1,
};

function Saves() {
  const [pots, setPots] = useState([]);
  const [savingsAmount, setSavingsAmount] = useState("50000");
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState("");
  const [selectedPot, setSelectedPot] = useState(null);
  const [depositHistory, setDepositHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPot, setHistoryPot] = useState(null);
  const [historyError, setHistoryError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    target: "",
    priority: "Medium",
    date: "",
    color: "teal",
  });

  const totalSaved = pots.reduce((sum, pot) => sum + pot.saved, 0);
  const availableSlots = 4 - pots.length;

  // Share the planned savings according to each pot's priority.
 const allocations = useMemo(() => {
    const amount = Math.max(0, Number(savingsAmount) || 0);

    const eligiblePots = pots.filter(
        pot => pot.saved < pot.target
    );

    const totalWeight = eligiblePots.reduce(
        (sum, pot) => sum + priorityWeight[pot.priority],
        0
    );

    return Object.fromEntries(
        eligiblePots.map(pot => {
            const remaining = pot.target - pot.saved;

            const plannedAmount = totalWeight
                ? Math.floor(
                    (amount * priorityWeight[pot.priority]) / totalWeight
                )
                : 0;

            return [
                pot.id,
                Math.min(plannedAmount, remaining)
            ];
        })
    );
}, [pots, savingsAmount]);

 async function handleCreatePot(event) {
    event.preventDefault();

    if (pots.length >= 4) return;

    const target = Number(form.target);

    if (!form.name.trim() || !target || target <= 0) {
        setNotice("Enter a pot name and a valid target amount.");
        return;
    }

    try {
        setSaving(true);
        setNotice("");

        const newPot = {
            name: form.name.trim(),
            description: form.description.trim(),
            target,
            priority: form.priority,
            date: form.date || null,
            color: form.color
        };

        const data = await createPot(newPot);

        setPots(current => [...current, data.pot]);

        setForm({
            name: "",
            description: "",
            target: "",
            priority: "Medium",
            date: "",
            color: "teal",
        });

        setShowForm(false);
        setNotice("Your new savings pot has been created.");

    } catch (error) {
        setNotice(error.message);
    } finally {
        setSaving(false);
    }
}

 async function addSavings(pot) {
    const amount = allocations[pot.id] || 0;

    if (amount <= 0) {
        setNotice("Enter a savings amount greater than zero.");
        return;
    }

    const remaining = pot.target - pot.saved;

    if (amount > remaining) {
        setNotice(
            `You can only add ${formatMoney(remaining)} to this pot.`
        );
        return;
    }

    try {
        setSaving(true);
        setNotice("");

        const data = await depositIntoPot(pot.id, {
            amount,
            description: "Planned savings deposit"
        });

        setPots(current =>
            current.map(item =>
                item.id === pot.id ? data.pot : item
            )
        );

        setNotice(
            data.pot.saved >= data.pot.target
                ? `${pot.name} has reached its savings target!`
                : `${formatMoney(amount)} added to ${pot.name}.`
        );

        setSelectedPot(null);

    } catch (error) {
        setNotice(error.message);
    } finally {
        setSaving(false);
    }
}

 async function deletePot(pot) {
    const confirmed = window.confirm(
        `Are you sure you want to delete "${pot.name}"? Its deposit history will also be permanently deleted.`
    );

    if (!confirmed) return;

    try {
        setSaving(true);
        setNotice("");

        await deletePotFromAPI(pot.id);

        setPots(current =>
            current.filter(item => item.id !== pot.id)
        );

        setSelectedPot(null);
        setNotice(`${pot.name} and its deposit history have been deleted.`);

    } catch (error) {
        setNotice(error.message);
    } finally {
        setSaving(false);
    }
}

async function viewDepositHistory(pot) {
    
    try {
        setHistoryLoading(true);
        setHistoryError("");
        setDepositHistory([]);
        setHistoryPot(pot);

        const data = await getPotDeposits(pot.id);

        setDepositHistory(data.deposits || []);
    } catch (error) {
        console.error("Error loading deposit history:", error.message);
        setHistoryError(error.message);
    } finally {
        setHistoryLoading(false);
    }
}

  useEffect(() => {
    async function loadPots() {
        try {
            setLoading(true);
            setLoadError("");

            const data = await getPots();

            setPots(data.pots || []);
        } catch (error) {
          console.error("Error loading pots:", error.message);
            setLoadError(error.message);
        } finally {
            setLoading(false);
        }
    }

    loadPots();
}, [retryCount]);

  return (
    <div className="pots-page">
      <header className="pots-header">
        <div>
          <span className="pots-eyebrow">SAVE SMARTER</span>
          <h2>Pots</h2>
          <p>Create savings pots, set priorities and watch your goals grow.</p>
        </div>

        <div className="pots-total-pill">
          <span className="pots-total-icon">
            <PiggyBank size={23} />
          </span>
          <div>
            <span>Saved across pots</span>
            <strong>
              {loading ? (
                  <Skeleton width="130px" height="22px" />
              ) : loadError ? ("Unavailable") : (
                  formatMoney(totalSaved)
              )}
           </strong>
          </div>
        </div>
      </header>

      <div className="pots-tip">
        <Lightbulb size={21} />
        <p>
          You can create up to 4 pots. Your planned savings are shared
          according to each pot&apos;s priority.
        </p>
      </div>

      {notice && (
        <div className="pots-notice" role="status">
          <CheckCircle2 size={20} />
          <span>{notice}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={18} />
          </button>
        </div>
      )}

      <section className="pots-summary">
        <div>
          <h3>Your Pots ({pots.length}/4)</h3>
          <p>
            {pots.length} active {pots.length === 1 ? "pot" : "pots"} ·{" "}
            {availableSlots} {availableSlots === 1 ? "spot" : "spots"} left
          </p>
        </div>

        <button
          className="pots-add-button"
          type="button"
          disabled={pots.length >= 4}
          onClick={() => setShowForm(true)}
        >
          <Plus size={19} />
          Add Pot
        </button>
      </section>

      {loading ? (
        <div className="pots-empty">
          {[1, 2, 3].map((item) => (
              <article className="pot-card pot-teal" key={item}>
                  <div className="pot-card-top">
                      <Skeleton width="48px" height="48px" borderRadius="50%" />

                      <div className="pot-title">
                          <Skeleton width="120px" height="18px" />
                          <Skeleton width="90px" height="14px" />
                      </div>
                  </div>

                  <Skeleton width="85%" height="13px" />

                  <div className="pot-progress-heading">
                      <Skeleton width="65px" height="14px" />
                      <Skeleton width="35px" height="14px" />
                  </div>

                  <Skeleton width="100%" height="9px" borderRadius="10px" />

                  <div className="pot-amounts">
                      <Skeleton width="100px" height="17px" />
                      <Skeleton width="85px" height="15px" />
                  </div>

                  <div className="pot-remaining">
                      <Skeleton width="80px" height="14px" />
                      <Skeleton width="90px" height="16px" />
                  </div>

                  <div className="pot-details">
                      <Skeleton width="110px" height="35px" />
                      <Skeleton width="110px" height="35px" />
                  </div>

                  <Skeleton width="100%" height="42px" borderRadius="10px" />
                  <Skeleton width="100%" height="25px" />
              </article>
          ))}
        </div>
        ) :  loadError ? (
          <div className="pots-empty">
              <PiggyBank size={40} />
              <h3>Unable to load your pots</h3>
              <p>{loadError}</p>

              <button
                  type="button"
                  className="pots-retry-btn"
                  onClick={() => setRetryCount(prev => prev + 1)}
              >
                  Try Again
              </button>
          </div>
        ): pots.length === 0 ? (
        <div className="pots-empty">
          <PiggyBank size={40} />
          <h3>Start saving towards a goal</h3>
          <p>Create your first pot and give your money a purpose.</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            disabled={pots.length >= 4}
          >
            <Plus size={18} /> Create your first pot
          </button>
        </div>
      ) : (
        <div className="pots-grid">
          {pots.map((pot) => {
            const Icon = pot.icon || PiggyBank;
            const progress = Math.min(
              100,
              Math.round((pot.saved / pot.target) * 100)
            );
            const remaining = Math.max(0, pot.target - pot.saved);

            return (
              <article
                className={`pot-card pot-${pot.color}`}
                key={pot.id}
              >
                <div className="pot-card-top">
                  <span className="pot-icon">
                    <Icon size={27} />
                  </span>

                  <div className="pot-title">
                    <h4>{pot.name}</h4>
                    <span className={`pot-priority priority-${pot.priority.toLowerCase()}`}>
                      <ArrowUpRight size={14} />
                      {pot.priority} priority
                    </span>
                  </div>

                  <div className="pot-menu-wrap">
                    <button
                      type="button"
                      className="pot-menu-button"
                      aria-label={`Options for ${pot.name}`}
                      onClick={() =>
                        setSelectedPot(
                          selectedPot === pot.id ? null : pot.id
                        )
                      }
                    >
                      <MoreVertical size={20} />
                    </button>

                    {selectedPot === pot.id && (
                      <div className="pot-menu">
                        <button
                          type="button"
                          onClick={() => deletePot(pot)}
                        >
                          Remove pot
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <p className="pot-description">
                  {pot.description || "Saving towards your goal."}
                </p>

                <div className="pot-progress-heading">
                  <span>Progress</span>
                  <strong>{progress}%</strong>
                </div>

                <div
                  className="pot-progress-track"
                  role="progressbar"
                  aria-label={`${pot.name} progress`}
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="pot-progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="pot-amounts">
                  <strong>{formatMoney(pot.saved)}</strong>
                  <span>of {formatMoney(pot.target)}</span>
                </div>

                <div className="pot-remaining">
                  <span>Still needed</span>
                  <strong>{formatMoney(remaining)}</strong>
                </div>

                <div className="pot-details">
                  <div>
                    <CalendarDays size={18} />
                    <span>
                      Target date
                      <strong>
                        {pot.date
                          ? new Date(`${pot.date}T12:00:00`).toLocaleDateString(
                              "en-NG",
                              {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              }
                            )
                          : "Not set"}
                      </strong>
                    </span>
                  </div>

                  <div>
                    <Wallet size={18} />
                    <span>
                      Planned savings
                      <strong>
                        {formatMoney(allocations[pot.id] || 0)}
                      </strong>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="pot-save-button"
                  disabled={!allocations[pot.id] || saving}
                  onClick={() => addSavings(pot)}
                >
                  <Plus size={17} />
                  Add planned savings
                </button>

                <button
                  type="button"
                  className="pot-history-button"
                  onClick={() => viewDepositHistory(pot)}
                >
                  <span>View deposit history</span>
                  <ArrowUpRight size={16} />
                </button>
              </article>
            );
          })}

          {pots.length < 4 && (
            <button
              type="button"
              className="pot-add-card"
              onClick={() => setShowForm(true)}
            >
              <span className="pot-add-circle">
                <Plus size={28} />
              </span>
              <strong>Add a new pot</strong>
              <span>You can create {availableSlots} more</span>
            </button>
          )}
        </div>
      )}

      <section className="pots-footer-info">
        <span className="pots-footer-icon">
          <Coins size={24} />
        </span>
        <div>
          <strong>When a pot reaches its target</strong>
          <p>
            It will be marked as completed and remain in your pots
            with its saved amount preserved. You can still view
            its deposit history.
          </p>
          <small>
            Completed pots remain visible at 100% progress.
          </small>
        </div>
      </section>

      {historyPot && (
        <div
            className="pots-modal-backdrop"
            onClick={() => setHistoryPot(null)}
        >
            <div
                className="pots-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="deposit-history-title"
                onClick={event => event.stopPropagation()}
            >
                <div className="pots-modal-heading">
                    <div>
                        <span className="pots-eyebrow">SAVINGS RECORD</span>
                        <h3 id="deposit-history-title">
                            {historyPot.name} History
                        </h3>
                    </div>

                    <button
                        type="button"
                        className="pot-close-button"
                        aria-label="Close history"
                        onClick={() => setHistoryPot(null)}
                    >
                        <X size={21} />
                    </button>
                </div>

                {historyLoading ? (
                    <div className="pot-history-list">
                        {[1, 2, 3].map((item) => (
                            <div className="pot-history-item" key={item}>
                                <div>
                                    <Skeleton width="110px" height="18px" />
                                    <Skeleton width="150px" height="13px" />
                                </div>

                                <Skeleton width="115px" height="14px" />
                            </div>
                        ))}
                    </div>
                ) : historyError ? (
                  <div className="history-error">
                      <p>Unable to load deposit history.</p>
                      <p>{historyError}</p>

                      <button
                          type="button"
                          className="pots-retry-btn"
                          onClick={() => viewDepositHistory(historyPot)}
                      >
                          Try Again
                      </button>
                  </div>
                ) : depositHistory.length === 0 ? (
                    <p>No deposits have been made to this pot yet.</p>
                ) : (
                    <div className="pot-history-list">
                        {depositHistory.map(deposit => (
                            <div
                                className="pot-history-item"
                                key={deposit.id}
                            >
                                <div>
                                    <strong>
                                        {formatMoney(deposit.amount)}
                                    </strong>

                                    <p>
                                        {deposit.description ||
                                            "Savings deposit"}
                                    </p>
                                </div>

                                <small>
                                    {new Date(
                                        deposit.createdAt
                                    ).toLocaleString("en-NG", {
                                        dateStyle: "medium",
                                        timeStyle: "short",
                                    })}
                                </small>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )}

      {showForm && (
        <div
          className="pots-modal-backdrop"
          onClick={() => setShowForm(false)}
        >
          <div
            className="pots-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-pot-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pots-modal-heading">
              <div>
                <span className="pots-eyebrow">A NEW GOAL</span>
                <h3 id="create-pot-title">Create a pot</h3>
              </div>
              <button
                type="button"
                className="pot-close-button"
                aria-label="Close form"
                onClick={() => setShowForm(false)}
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleCreatePot}>
              <label htmlFor="pot-name">Pot name</label>
              <input
                id="pot-name"
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="e.g. New phone"
                maxLength={40}
                required
              />

              <label htmlFor="pot-description">Description</label>
              <textarea
                id="pot-description"
                value={form.description}
                onChange={(event) =>
                  setForm({ ...form, description: event.target.value })
                }
                placeholder="What are you saving for?"
                rows={2}
              />

              <label htmlFor="pot-target">Target amount (₦)</label>
              <input
                id="pot-target"
                type="number"
                min="1"
                value={form.target}
                onChange={(event) =>
                  setForm({ ...form, target: event.target.value })
                }
                placeholder="100000"
                required
              />

              <label htmlFor="pot-priority">Savings priority</label>
              <select
                id="pot-priority"
                value={form.priority}
                onChange={(event) =>
                  setForm({ ...form, priority: event.target.value })
                }
              >
                <option value="High">High priority</option>
                <option value="Medium">Medium priority</option>
                <option value="Low">Low priority</option>
              </select>

              <label htmlFor="pot-date">Target date (optional)</label>
              <input
                id="pot-date"
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm({ ...form, date: event.target.value })
                }
              />

              <label htmlFor="pot-color">Pot color</label>
              <select
                id="pot-color"
                value={form.color}
                onChange={(event) =>
                  setForm({ ...form, color: event.target.value })
                }
              >
                <option value="teal">Teal</option>
                <option value="peach">Peach</option>
                <option value="blue">Blue</option>
              </select>

              <div className="pots-form-actions">
                <button
                  type="button"
                  className="pots-cancel-button"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pots-submit-button"
                  disabled={pots.length >= 4 || saving}
                >
                  {saving ? "Creating..." : "Create pot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Saves;

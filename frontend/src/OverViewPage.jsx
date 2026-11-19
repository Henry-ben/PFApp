
import { useState } from "react";
import OverView from "./pages/overview";
import Transaction from "./pages/transactions";
import Budget from "./pages/budget";
import Bills from "./pages/recurringBills";
import Saves from "./pages/pots";
import {
  House,
  ArrowDownUp,
  ChartPie,
  Wallet,
  ReceiptText,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import "./css/overview.css";

function OverViewPage() {
  const [activePage, setActivePage] = useState("Overview");
  const [menuOpen, setMenuOpen] = useState(true);

  // Shared transactions for the Transactions and Recurring Bills pages
  const [transactions, setTransactions] = useState([]);

  const navigation = [
    { name: "Overview", icon: House },
    { name: "Transactions", icon: ArrowDownUp },
    { name: "Budgets", icon: ChartPie },
    { name: "Pots", icon: Wallet },
    { name: "Recurring Bills", icon: ReceiptText },
  ];

  return (
    <div className={`app-layout ${menuOpen ? "" : "menu-closed"}`}>
      <aside className="sidebar">
        <h2 className="brand">{menuOpen ? "Finance" : "f"}</h2>

        <nav className="nav-menu">
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={`nav-item ${
                activePage === name ? "active" : ""
              }`}
              onClick={() => setActivePage(name)}
              title={name}
            >
              <Icon size={21} />
              {menuOpen && <span>{name}</span>}
            </button>
          ))}
        </nav>

        <button
          className="minimize-btn"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? (
            <PanelLeftClose size={20} />
          ) : (
            <PanelLeftOpen size={20} />
          )}
          {menuOpen && <span>Minimize Menu</span>}
        </button>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <h1>{activePage}</h1>
        </header>

        {activePage === "Overview" ? (
          <OverView setActivePage={setActivePage} />
        ) : activePage === "Transactions" ? (
          <Transaction
            transactions={transactions}
            setTransactions={setTransactions}
          />
        ) : activePage === "Budgets" ? (
          <Budget />
        ) : activePage === "Pots" ? (
          <Saves />
        ) : (
          <Bills
            transactions={transactions}
            setTransactions={setTransactions}
          />
        )}
      </main>
    </div>
  );
}

export default OverViewPage;

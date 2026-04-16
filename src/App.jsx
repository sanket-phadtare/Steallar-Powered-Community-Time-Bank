import { useState, useEffect } from "react";
import { useWallet } from "./context/WalletContext";
import WalletConnect from "./components/WalletConnect";
import BalanceBadge from "./components/BalanceBadge";
import ServiceBoard from "./components/ServiceBoard";
import OfferForm from "./components/OfferForm";
import { registerUser, getBalance, offerService, requestService } from "./utils/contract";
import "./App.css";

// Truncate address for display
function short(addr) {
  if (!addr) return "";
  return addr.slice(0, 8) + "..." + addr.slice(-4);
}

export default function App() {
  const { publicKey, disconnect } = useWallet();
  const [tab, setTab] = useState("board");
  const [txStatus, setTxStatus] = useState(null); // null | "loading" | "success" | "error"
  const [txMessage, setTxMessage] = useState("");
  const [lastTxHash, setLastTxHash] = useState(null);
  const [refreshOffers, setRefreshOffers] = useState(0);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [balance, setBalance] = useState(null);
  const [recordedCount, setRecordedCount] = useState(0);
  const [sentCount, setSentCount] = useState(0);
  const [txLog, setTxLog] = useState([
    { text: "Waiting for wallet...", active: false },
  ]);

  // Add entry to transaction log
  function addLog(text, active = false) {
    setTxLog(prev => [{ text, active }, ...prev].slice(0, 8));
  }

  // Refresh balance helper
  async function refreshBalance() {
    if (!publicKey) return;
    const bal = await getBalance(publicKey);
    setBalance(bal);
  }

  // Register on connect
  useEffect(() => {
    if (!publicKey) {
      setIsRegistered(false);
      setBalance(null);
      setTxLog([{ text: "Waiting for wallet...", active: false }]);
      return;
    }
    addLog(`Wallet connected · ${short(publicKey)}`, false);
    registerUser(publicKey)
      .then(async () => {
        setIsRegistered(true);
        setRefreshOffers(n => n + 1);
        await refreshBalance();
      })
      .catch((e) => {
        const msg = e?.message || "";
        if (msg.includes("Error(Contract, #1)") || msg.includes("already registered")) {
          setIsRegistered(true);
          refreshBalance();
        }
      });
  }, [publicKey]);

  async function handleRegister() {
    setRegistering(true);
    addLog("Registering account on-chain...", true);
    try {
      await registerUser(publicKey);
      setIsRegistered(true);
      setRefreshOffers(n => n + 1);
      await refreshBalance();
      addLog("Registered · received 5 time credits", true);
    } catch (err) {
      const msg = err?.message || "";
      if (msg.includes("Error(Contract, #1)") || msg.includes("already registered")) {
        setIsRegistered(true);
        refreshBalance();
        addLog("Already registered · credits ready", false);
      } else {
        addLog("Registration failed · " + msg.slice(0, 40), false);
      }
    } finally {
      setRegistering(false);
    }
  }

  async function handleOffer(data) {
    setTxStatus("loading");
    setTxMessage("Posting offer on-chain...");
    addLog("Posting offer · signing...", true);
    try {
      await offerService(publicKey, data.description, data.hours);
      setTxStatus("success");
      setTxMessage("Offer posted successfully!");
      setRecordedCount(n => n + 1);
      setRefreshOffers(n => n + 1);
      await refreshBalance();
      addLog(`Offer posted · "${data.description}"`, true);
      setTab("board");
    } catch (err) {
      setTxStatus("error");
      setTxMessage(err.message || "Transaction failed");
      addLog("Offer failed · " + (err.message || "").slice(0, 40), false);
    } finally {
      setTimeout(() => setTxStatus(null), 5000);
    }
  }

  async function handleRequest(offer) {
    setTxStatus("loading");
    setTxMessage(`Requesting "${offer.description}" — signing...`);
    addLog(`Requesting "${offer.description}"...`, true);
    try {
      const result = await requestService(publicKey, offer.id);
      const hash = result?.hash || result?.id || null;
      setLastTxHash(hash);
      setTxStatus("success");
      setTxMessage(`${offer.hours} credit${offer.hours !== 1 ? "s" : ""} transferred.`);
      setSentCount(n => n + 1);
      setRefreshOffers(n => n + 1);
      await refreshBalance();
      addLog(
        `Sent ${offer.hours} credit${offer.hours !== 1 ? "s" : ""} → ${short(offer.provider)} · recorded on-chain`,
        true
      );
    } catch (err) {
      setTxStatus("error");
      setTxMessage(err.message || "Transaction failed");
      addLog("Transaction failed · " + (err.message || "").slice(0, 40), false);
    } finally {
      setTimeout(() => setTxStatus(null), 5000);
    }
  }

  const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID || "";

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-dot" />
          <h1>Community Time Bank</h1>
        </div>
        <div className="header-right">
          {publicKey && (
            <>
              <span className="header-pill network">TESTNET</span>
              {CONTRACT_ID && (
                <span className="header-pill" title={CONTRACT_ID}>
                  Contract: {CONTRACT_ID.slice(0, 6)}…{CONTRACT_ID.slice(-4)}
                </span>
              )}
              <span className="header-pill">{short(publicKey)}</span>
              <button className="btn-disconnect" onClick={disconnect}>
                Disconnect
              </button>
            </>
          )}
          {!publicKey && <WalletConnect />}
        </div>
      </header>

      {/* ── Dashboard ── */}
      {!publicKey ? (
        <div className="connect-screen">
          <p className="connect-title">Connect your Freighter wallet to begin</p>
          <WalletConnect />
        </div>
      ) : !isRegistered ? (
        <div className="register-banner">
          <p>You are not registered yet.<br />Register to receive <strong>5 free time credits</strong>.</p>
          <button className="btn-register" onClick={handleRegister} disabled={registering}>
            {registering ? <><span className="spinner" /> Registering...</> : "Register & get 5 credits"}
          </button>
        </div>
      ) : (
        <div className="dashboard">

          {/* ── Panel 1: Balance & Wallet Info ── */}
          <div className="panel">
            <div className="panel-label">Balance</div>
            <div className="panel-body">
              <div className="balance-block">
                <span className="balance-token">Time Credits</span>
                <span className="balance-amount">{balance ?? "—"}</span>
                <span className="balance-network">Community Timebank · Stellar Testnet</span>
              </div>

              <div className="panel-label" style={{ padding: "0 0 8px", border: "none" }}>Wallet Info</div>
              <div className="info-section">
                <div className="info-row">
                  <span className="info-label">Network</span>
                  <span className="info-value accent">Testnet</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Address</span>
                  <span className="info-value">{short(publicKey)}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Wallet</span>
                  <span className="info-value">🪁 Freighter</span>
                </div>
              </div>

              {CONTRACT_ID && (
                <>
                  <div className="panel-label" style={{ padding: "0 0 8px", border: "none" }}>Contract Info</div>
                  <div className="contract-block">
                    <span className="contract-label">Deployed Address</span>
                    <span className="contract-address">{CONTRACT_ID}</span>
                    <a
                      className="link-small"
                      href={`https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View on Explorer ↗
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Panel 2: Services (browse / offer) ── */}
          <div className="panel">
            <div className="tab-bar">
              <button className={`tab-btn ${tab === "board" ? "active" : ""}`} onClick={() => setTab("board")}>
                Browse Services
              </button>
              <button className={`tab-btn ${tab === "offer" ? "active" : ""}`} onClick={() => setTab("offer")}>
                Offer a Service
              </button>
            </div>

            {tab === "board" && (
              <ServiceBoard
                onRequest={handleRequest}
                refreshKey={refreshOffers}
              />
            )}

            {tab === "offer" && (
              <OfferForm onSubmit={handleOffer} />
            )}
          </div>

          {/* ── Panel 3: On-chain history ── */}
          <div className="panel" style={{ flexDirection: "column" }}>
            <div className="history-header">
              <div className="history-title">
                <div className="live-dot" />
                On-Chain Recorded History
              </div>
              <span className="record-count">{recordedCount} records</span>
            </div>

            {txLog.filter(l => l.active).length === 0 ? (
              <div className="empty-history">No transactions yet</div>
            ) : (
              <div className="history-list">
                {txLog.filter(l => l.active).map((item, i) => (
                  <div className="history-item" key={i}>
                    <div className="history-row">
                      <span className="history-badge">TX</span>
                      <span className="history-addresses">{item.text}</span>
                    </div>
                    {lastTxHash && i === 0 && (
                      <div className="history-sub">
                        Contract call:&nbsp;
                        <a
                          href={`https://stellar.expert/explorer/testnet/tx/${lastTxHash}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {lastTxHash.slice(0, 8)}…{lastTxHash.slice(-6)} ↗
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Transaction status toast inside panel */}
            {txStatus && (
              <div style={{ padding: "0 20px 16px" }}>
                <div className={txStatus === "error" ? "toast-error" : "toast-confirmed"}>
                  {txStatus === "loading" && <span className="spinner" />}
                  {txStatus === "success" && "✓"}
                  {txStatus === "error" && "✕"}
                  <span>{txMessage}</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Panel 4: Stats & Log ── */}
          <div className="panel">
            <div className="panel-label">Contract Stats</div>
            <div className="panel-body">
              <div className="stats-grid">
                <div className="stat-cell">
                  <span className="stat-number">{recordedCount}</span>
                  <span className="stat-label">Recorded</span>
                </div>
                <div className="stat-cell">
                  <span className="stat-number">{sentCount}</span>
                  <span className="stat-label">Sent</span>
                </div>
              </div>

              {lastTxHash && (
                <>
                  <div className="panel-label" style={{ padding: "0 0 8px", border: "none" }}>Last TX Status</div>
                  <div className="status-block">
                    <div className="status-indicator">
                      <div className="status-dot-confirmed" />
                      confirmed
                    </div>
                    <span className="status-hash">{lastTxHash}</span>
                    <a
                      className="link-small"
                      href={`https://stellar.expert/explorer/testnet/tx/${lastTxHash}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View on Explorer ↗
                    </a>
                  </div>
                </>
              )}

              <div className="panel-label" style={{ padding: "0 0 8px", border: "none" }}>Transaction Log</div>
              <div className="tx-log">
                {txLog.map((item, i) => (
                  <div className="log-item" key={i}>
                    <div className={`log-dot ${item.active ? "active" : ""}`} />
                    <span className="log-text">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
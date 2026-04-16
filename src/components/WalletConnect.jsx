import { useWallet } from "../context/WalletContext";

export default function WalletConnect() {
  const { publicKey, loading, error, connect, disconnect } = useWallet();

  const short = (key) => `${key.slice(0, 6)}...${key.slice(-4)}`;

  return (
    <div className="wallet-bar">
      {publicKey ? (
        <div className="wallet-connected">
          <span className="wallet-address">{short(publicKey)}</span>
          <button className="btn btn-ghost" onClick={disconnect}>Disconnect</button>
        </div>
      ) : (
        <button className="btn btn-primary" onClick={connect} disabled={loading}>
          {loading ? <span className="spinner" /> : "Connect Freighter"}
        </button>
      )}
      {error && <p className="error-msg">{error}</p>}
    </div>
  );
}
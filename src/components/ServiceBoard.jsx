import { useEffect, useState } from "react";
import { useWallet } from "../context/WalletContext";
import { getOffers } from "../utils/contract";

function short(addr) {
  if (!addr) return "";
  return addr.slice(0, 8) + "…";
}

export default function ServiceBoard({ onRequest, refreshKey }) {
  const { publicKey } = useWallet();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!publicKey) return;
    setLoading(true);
    getOffers(publicKey)
      .then(setOffers)
      .finally(() => setLoading(false));
  }, [publicKey, refreshKey]);

  if (loading) return (
    <div className="service-list">
      {[0, 1, 2].map(i => (
        <div key={i} className="service-item">
          <div className="service-info">
            <div className="skeleton" style={{ height: 14, width: "60%", marginBottom: 6 }} />
            <div className="skeleton" style={{ height: 10, width: "35%" }} />
          </div>
          <div className="skeleton" style={{ height: 26, width: 64 }} />
        </div>
      ))}
    </div>
  );

  if (offers.length === 0) {
    return <div className="empty-state">No services listed yet.</div>;
  }

  return (
    <div className="service-list" style={{ flex: 1, overflowY: "auto" }}>
      {offers.map(offer => (
        <div className="service-item" key={offer.id}>
          <div className="service-info">
            <span className="service-desc">{offer.description}</span>
            <span className="service-provider">{short(offer.provider)}</span>
          </div>
          <div className="service-right">
            <span className="credit-pill">
              {offer.hours} credit{offer.hours !== 1 ? "s" : ""}
            </span>
            {publicKey && (
              <button className="btn-request" onClick={() => onRequest(offer)}>
                Request
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
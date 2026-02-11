import { useState, useEffect } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";

// 小图标组件
const Icon = ({ trend }) => {
  if (trend === 'up') return <TrendingUp size={12} color="#ef4444" />;
  if (trend === 'down') return <TrendingDown size={12} color="#3b82f6" />;
  return <Minus size={12} color="#475569" />;
};

export default function SectorDashboard() {
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`./data.json?t=${new Date().getTime()}`);
      if (!res.ok) throw new Error("Data file not found");
      const data = await res.json();
      setSectors(data);
      setLastUpdated(new Date().toLocaleString('ja-JP'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div style={{ padding: "20px", background: "#0f172a", minHeight: "100vh", color: "#e2e8f0", fontFamily: "sans-serif" }}>
      
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: "bold", margin: 0 }}>東証33業種 3社個別詳細マップ</h1>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>
             {lastUpdated ? `更新: ${lastUpdated}` : "Loading..."}
          </span>
        </div>
        <button onClick={fetchData} style={{ background: "#3b82f6", border: "none", padding: "8px 16px", borderRadius: 4, color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
        {sectors.map((s) => (
          <div key={s.code} style={{ 
            background: "#1e293b", 
            borderRadius: 8, 
            padding: "12px", 
            borderTop: "3px solid #475569"
          }}>
            
            {/* Sector Title */}
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, borderBottom: "1px solid #334155", paddingBottom: 6 }}>
              <span style={{ fontSize: 15, fontWeight: "bold", color: "#f8fafc" }}>{s.name}</span>
              <span style={{ fontSize: 11, color: "#64748b" }}>{s.code}</span>
            </div>

            {/* Stocks Table */}
            <div style={{ display: "grid", gap: 6 }}>
              {/* Table Header */}
              <div style={{ display: "grid", gridTemplateColumns: "3fr 1.5fr 1.5fr 1.5fr 0.5fr", fontSize: 10, color: "#64748b" }}>
                <div>銘柄</div>
                <div style={{textAlign: "right"}}>PBR</div>
                <div style={{textAlign: "right"}}>PER</div>
                <div style={{textAlign: "right"}}>利回り</div>
                <div></div>
              </div>

              {/* Rows */}
              {s.stocks && s.stocks.map((stock) => (
                <div key={stock.code} style={{ 
                  display: "grid", 
                  gridTemplateColumns: "3fr 1.5fr 1.5fr 1.5fr 0.5fr", 
                  fontSize: 12, 
                  alignItems: "center",
                  borderBottom: "1px dashed #334155",
                  paddingBottom: 2
                }}>
                  {/* Name */}
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#cbd5e1" }}>
                    <span style={{ fontSize: 9, color: "#64748b", marginRight: 4 }}>{stock.code}</span>
                    {stock.name}
                  </div>

                  {/* PBR (Color Coded) */}
                  <div style={{ textAlign: "right", fontWeight: "bold", 
                    color: !stock.pbr ? "#64748b" : stock.pbr < 0.8 ? "#60a5fa" : stock.pbr > 1.5 ? "#f87171" : "#e2e8f0" 
                  }}>
                    {stock.pbr ? stock.pbr.toFixed(2) : "-"}
                  </div>

                  {/* PER */}
                  <div style={{ textAlign: "right", color: "#94a3b8" }}>
                    {stock.per ? stock.per.toFixed(1) : "-"}
                  </div>

                  {/* Yield */}
                  <div style={{ textAlign: "right", color: stock.yield > 3.5 ? "#fbbf24" : "#cbd5e1" }}>
                    {stock.yield ? `${stock.yield}%` : "-"}
                  </div>

                  {/* Trend */}
                  <div style={{ textAlign: "right" }}>
                    <Icon trend={stock.trend} />
                  </div>
                </div>
              ))}
            </div>

          </div>
        ))}
      </div>
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        body { margin: 0; }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
      `}</style>
    </div>
  );
}

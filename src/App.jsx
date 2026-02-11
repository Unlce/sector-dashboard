import { useState, useEffect } from "react";
import { RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";

// 默认静态列表，防止首次加载空白
const SECTORS = [
  { code: "0251", name: "水産・農林業" }, { code: "0253", name: "鉱業" }, { code: "0254", name: "建設業" },
  { code: "0256", name: "食料品" }, { code: "0255", name: "繊維製品" }, { code: "0257", name: "パルプ・紙" },
  { code: "0258", name: "化学" }, { code: "0259", name: "医薬品" }, { code: "0260", name: "石油・石炭製品" },
  { code: "0261", name: "ゴム製品" }, { code: "0262", name: "ガラス・土石製品" }, { code: "0263", name: "鉄鋼" },
  { code: "0264", name: "非鉄金属" }, { code: "0265", name: "金属製品" }, { code: "0266", name: "機械" },
  { code: "0267", name: "電気機器" }, { code: "0268", name: "輸送用機器" }, { code: "0269", name: "精密機器" },
  { code: "0270", name: "その他製品" }, { code: "0271", name: "電気・ガス業" }, { code: "0272", name: "陸運業" },
  { code: "0273", name: "海運業" }, { code: "0274", name: "空運業" }, { code: "0275", name: "倉庫・運輸関連業" },
  { code: "0276", name: "情報・通信業" }, { code: "0277", name: "卸売業" }, { code: "0278", name: "小売業" },
  { code: "0279", name: "銀行業" }, { code: "0280", name: "証券、商品先物" }, { code: "0281", name: "保険業" },
  { code: "0282", name: "その他金融業" }, { code: "0283", name: "不動産業" }, { code: "0284", name: "サービス業" }
];

const Icon = ({ trend }) => {
  if (trend === 'up') return <TrendingUp size={14} color="#ef4444" />;
  if (trend === 'down') return <TrendingDown size={14} color="#3b82f6" />;
  return <Minus size={14} color="#94a3b8" />;
};

export default function SectorDashboard() {
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      // 读取 GitHub Actions 自动生成的 data.json
      const res = await fetch('./data.json');
      if (!res.ok) throw new Error("Data file not found");
      const data = await res.json();
      setSectors(data);
      setLastUpdated(new Date().toLocaleString('ja-JP'));
    } catch (err) {
      console.error(err);
      // 如果没有数据，显示默认空列表
      setSectors(SECTORS.map(s => ({...s, pbr: "-", per: "-", yield: "-", trend: "flat"})));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div style={{ padding: 20, background: "#0f172a", minHeight: "100vh", color: "white", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: "bold", margin: 0 }}>東証33業種 サイクルマップ</h1>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>
             {lastUpdated ? `更新日時: ${lastUpdated}` : "Loading..."}
          </span>
        </div>
        <button onClick={fetchData} style={{ background: "#3b82f6", border: "none", padding: "8px 16px", borderRadius: 4, color: "white", cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          更新
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
        {sectors.map((s) => (
          <div key={s.code} style={{ 
            background: "#1e293b", 
            borderRadius: 8, 
            padding: 12, 
            borderLeft: `4px solid ${s.pbr < 0.8 ? '#3b82f6' : s.pbr > 1.5 ? '#ef4444' : '#22c55e'}`
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 14, fontWeight: "bold" }}>{s.name}</span>
              <span style={{ fontSize: 10, color: "#64748b" }}>{s.code}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
              <div>
                <div style={{ color: "#94a3b8", fontSize: 10 }}>PBR</div>
                <div style={{ fontWeight: "bold", fontSize: 14, color: s.pbr < 0.8 ? "#60a5fa" : "white" }}>
                  {s.pbr}x
                </div>
              </div>
              <div>
                <div style={{ color: "#94a3b8", fontSize: 10 }}>PER</div>
                <div>{s.per}x</div>
              </div>
              <div>
                <div style={{ color: "#94a3b8", fontSize: 10 }}>利回り</div>
                <div style={{ color: "#fbbf24" }}>{s.yield}%</div>
              </div>
              <div style={{ display: "flex", alignItems: "end", justifyContent: "end" }}>
                <Icon trend={s.trend} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        body { margin: 0; }
      `}</style>
    </div>
  );
}

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 33 业种列表
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

const generateData = () => {
  console.log("Starting data simulation...");
  
  const data = SECTORS.map(sector => {
    // 这里目前是生成模拟数据
    // 部署成功后，我们可以把这里换成真实的 Kabutan 爬虫代码
    const pbr = (Math.random() * 1.5 + 0.4).toFixed(2);
    const per = (Math.random() * 15 + 8).toFixed(1);
    const divYield = (Math.random() * 3 + 1.5).toFixed(1);
    
    let trend = 'flat';
    if (Math.random() > 0.7) trend = 'up';
    if (Math.random() < 0.2) trend = 'down';

    return {
      ...sector,
      pbr,
      per,
      yield: divYield,
      trend
    };
  });

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  // 确保写入 public 目录（Vite 打包时会用到）
  const publicDir = path.join(__dirname, '../public');
  if (!fs.existsSync(publicDir)){
      fs.mkdirSync(publicDir, { recursive: true });
  }

  const filePath = path.join(publicDir, 'data.json');
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  console.log(`✅ Data generated at ${filePath}`);
};

generateData();

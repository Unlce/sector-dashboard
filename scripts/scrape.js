import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const run = async () => {
  console.log("🔍 Debug Mode: Fetching raw HTML for 8058 (Mitsubishi Corp)...");
  
  const targetCode = '8058';
  const url = `https://minkabu.jp/stock/${targetCode}`;
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });

    // 1. 保存原始 HTML 到 public 文件夹，方便你直接查看
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const publicDir = path.join(__dirname, '../public');
    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

    const filePath = path.join(publicDir, 'debug_minkabu.html');
    fs.writeFileSync(filePath, data);
    
    console.log(`✅ Raw HTML saved to ${filePath}`);
    console.log(`👉 You can view it at: [Your-Page-URL]/debug_minkabu.html`);

    // 2. 同时生成一个假的 data.json 防止前端报错（保持页面不挂）
    const dummyData = [{
      code: "0000", name: "DEBUG MODE", 
      stocks: [{ code: targetCode, name: "See debug_minkabu.html", pbr: 0, per: 0, yield: 0, trend: 'flat' }]
    }];
    fs.writeFileSync(path.join(publicDir, 'data.json'), JSON.stringify(dummyData));

  } catch (error) {
    console.error("❌ Error:", error.message);
  }
};

run();

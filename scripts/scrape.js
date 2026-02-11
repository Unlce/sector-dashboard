import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import * as cheerio from 'cheerio';

// 【3股龙头配置】
const SECTOR_TARGETS = {
  "0251": ["1332", "1377", "1379"], // 水産・農林
  "0253": ["1605", "1662", "1514"], // 鉱業
  "0254": ["1928", "1801", "1925"], // 建設
  "0256": ["2802", "2503", "2914"], // 食料品
  "0255": ["3402", "3407", "3405"], // 繊維
  "0257": ["3861", "3863", "3864"], // パルプ
  "0258": ["4063", "4188", "6981"], // 化学
  "0259": ["4502", "4503", "4568"], // 医薬品
  "0260": ["5020", "5019", "5021"], // 石油
  "0261": ["5108", "5110", "5105"], // ゴム
  "0262": ["5201", "5233", "5333"], // ガラス
  "0263": ["5401", "5411", "5406"], // 鉄鋼
  "0264": ["5713", "5711", "5714"], // 非鉄
  "0265": ["5938", "5929", "5901"], // 金属
  "0266": ["6301", "6367", "6326"], // 機械
  "0267": ["6501", "6503", "6758"], // 電気機器
  "0268": ["7203", "7267", "7201"], // 輸送用
  "0269": ["7741", "4543", "7733"], // 精密
  "0270": ["7974", "7911", "7912"], // その他製品
  "0271": ["9501", "9503", "9531"], // 電気ガス
  "0272": ["9020", "9021", "9022"], // 陸運
  "0273": ["9101", "9104", "9107"], // 海運
  "0274": ["9201", "9202", "9232"], // 空運
  "0275": ["9301", "9064", "9302"], // 倉庫
  "0276": ["9432", "9433", "9984"], // 通信
  "0277": ["8058", "8031", "8001"], // 卸売 (商社)
  "0278": ["3382", "9983", "8267"], // 小売
  "0279": ["8306", "8316", "8411"], // 銀行
  "0280": ["8604", "8601", "8697"], // 証券
  "0281": ["8766", "8725", "8630"], // 保険
  "0282": ["8591", "8570", "8473"], // その他金融
  "0283": ["8801", "8802", "8830"], // 不動産
  "0284": ["6098", "4324", "4755"]  // サービス
};

const SECTOR_NAMES = {
  "0251": "水産・農林業", "0253": "鉱業", "0254": "建設業", "0256": "食料品",
  "0255": "繊維製品", "0257": "パルプ・紙", "0258": "化学", "0259": "医薬品",
  "0260": "石油・石炭", "0261": "ゴム製品", "0262": "ガラス土石", "0263": "鉄鋼",
  "0264": "非鉄金属", "0265": "金属製品", "0266": "機械", "0267": "電気機器",
  "0268": "輸送用機器", "0269": "精密機器", "0270": "その他製品", "0271": "電気・ガス",
  "0272": "陸運業", "0273": "海運業", "0274": "空運業", "0275": "倉庫・運輸",
  "0276": "情報・通信", "0277": "卸売業", "0278": "小売業", "0279": "銀行業",
  "0280": "証券商品", "0281": "保険業", "0282": "その他金融", "0283": "不動産業",
  "0284": "サービス業"
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchYahooData = async (code) => {
  const url = `https://finance.yahoo.co.jp/quote/${code}.T`;
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      timeout: 15000
    });
    
    // 名字提取 (使用 Cheerio)
    const $ = cheerio.load(data);
    let stockName = $('h1').text().trim() || code;
    stockName = stockName.replace(code, '').replace('.T', '').trim();

    // 🔴 核心数据提取 (使用正则表达式 - Regex Sniper)
    // 不再依赖 DOM 结构，直接在 HTML 文本里找 "PBR...倍"
    // Yahoo 的 HTML 里，PBR 后面一定跟着数值和 "倍" 字，而 EPS 后面是 "円"，所以不会搞混。
    
    const html = data;
    
    // 寻找 PBR (匹配示例: >PBR<... 1.23倍)
    // [^<]*? 意思是中间可能有一些标签或空格
    const pbrMatch = html.match(/>PBR.*?([0-9,.]+)倍/);
    const pbr = pbrMatch ? parseFloat(pbrMatch[1].replace(/,/g, '')) : null;

    // 寻找 PER
    const perMatch = html.match(/>PER.*?([0-9,.]+)倍/);
    const per = perMatch ? parseFloat(perMatch[1].replace(/,/g, '')) : null;

    // 寻找 利回り (匹配示例: >配当利回り<... 3.45%)
    const yieldMatch = html.match(/>配当利回り.*?([0-9,.]+)%/);
    const yieldVal = yieldMatch ? parseFloat(yieldMatch[1].replace(/,/g, '')) : null;

    // 趋势 (Yahoo 绿色是跌，红色是涨)
    let trend = 'flat';
    if (html.includes('priceChangeText_green')) trend = 'down';
    if (html.includes('priceChangeText_red')) trend = 'up';

    return { name: stockName, pbr, per, yield: yieldVal, trend };

  } catch (error) {
    console.error(`⚠️ Error Yahoo ${code}: ${error.message}`);
    return null;
  }
};

const run = async () => {
  console.log("🚀 Starting Scrape (Regex Sniper Mode)...");
  const results = [];

  for (const [sectorCode, stocks] of Object.entries(SECTOR_TARGETS)) {
    console.log(`\n📂 Sector ${sectorCode} (${SECTOR_NAMES[sectorCode]})...`);
    
    const stockDetails = [];

    for (const stockCode of stocks) {
      const data = await fetchYahooData(stockCode);
      await sleep(1500); 

      if (data) {
        // 打印出来确认一下
        const pbrStr = data.pbr !== null ? data.pbr : "-";
        console.log(`   - ${stockCode} ${data.name}: PBR ${pbrStr}x | PER ${data.per}x | Yield ${data.yield}%`);
        stockDetails.push({ code: stockCode, ...data });
      } else {
        console.log(`   - ${stockCode}: Failed`);
        stockDetails.push({
          code: stockCode, name: stockCode, 
          pbr: null, per: null, yield: null, trend: 'flat'
        });
      }
    }

    results.push({
      code: sectorCode,
      name: SECTOR_NAMES[sectorCode],
      stocks: stockDetails
    });
  }

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const publicDir = path.join(__dirname, '../public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  const filePath = path.join(publicDir, 'data.json');
  fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
  console.log(`✅ Data saved to ${filePath}`);
};

run();

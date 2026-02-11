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
  // Yahoo Finance Japan URL: https://finance.yahoo.co.jp/quote/8058.T
  // 加上 .T 后缀
  const url = `https://finance.yahoo.co.jp/quote/${code}.T`;
  
  try {
    const { data } = await axios.get(url, {
      headers: {
        // 伪装成真实的 Mac 浏览器，这对于 Yahoo 非常重要
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Referer': 'https://finance.yahoo.co.jp/'
      },
      timeout: 15000
    });
    const $ = cheerio.load(data);

    // 1. 获取名字 (Yahoo的结构通常是 h1 里的名字)
    let stockName = $('h1').text().trim() || code;
    // 清洗名字：去除代码和后缀，例如 "8058 三菱商事" -> "三菱商事"
    stockName = stockName.replace(code, '').replace('.T', '').trim();

    // 2. 暴力抓取 PBR/PER/Yield
    // Yahoo 的页面里，数据通常在一个列表里，我们需要找到包含 "PBR" 字样的元素，然后取它的下一个兄弟元素的文本
    let pbr = null, per = null, yieldVal = null;

    // 遍历所有可能的文本容器
    $('span, dt, th, li').each((i, el) => {
      const text = $(el).text();
      // 获取下一个元素的文本（通常数值就在旁边）
      const nextText = $(el).next().text();
      
      // 合并文本以便搜索（有时候数值包含在同一个标签里，有时候在隔壁）
      const combined = text + " " + nextText;

      // 提取数值的通用正则：匹配数字+小数点
      const extractNum = (str) => {
         const match = str.match(/([0-9]+\.[0-9]+|[0-9]+)/);
         return match ? parseFloat(match[0]) : null;
      };

      if (text.includes('PBR') && !pbr) {
        // 优先看隔壁，隔壁没有看自己
        pbr = extractNum(nextText) || extractNum(text);
      }
      if (text.includes('PER') && !per) {
        per = extractNum(nextText) || extractNum(text);
      }
      if (text.includes('配当利回り') && !yieldVal) {
        yieldVal = extractNum(nextText) || extractNum(text);
      }
    });

    // 3. 趋势 (Yahoo 比较难抓 trend，暂时设为 flat 或者根据股价颜色)
    let trend = 'flat';
    // 尝试寻找股价涨跌的颜色标识
    const htmlStr = $.html();
    if (htmlStr.includes('priceChangeText_green')) trend = 'down'; // Yahoo 跌是绿色
    if (htmlStr.includes('priceChangeText_red')) trend = 'up';   // Yahoo 涨是红色

    return { name: stockName, pbr, per, yield: yieldVal, trend };

  } catch (error) {
    console.error(`⚠️ Error Yahoo ${code}: ${error.message}`);
    // 失败时返回 null，保持队列继续
    return null;
  }
};

const run = async () => {
  console.log("🚀 Starting Scrape (Source: Yahoo Finance JP)...");
  const results = [];

  for (const [sectorCode, stocks] of Object.entries(SECTOR_TARGETS)) {
    console.log(`\n📂 Sector ${sectorCode} (${SECTOR_NAMES[sectorCode]})...`);
    
    const stockDetails = [];

    for (const stockCode of stocks) {
      const data = await fetchYahooData(stockCode);
      await sleep(1500); // 礼貌爬取，防止封IP

      if (data) {
        const pbrStr = data.pbr !== null ? data.pbr : "-";
        console.log(`   - ${stockCode} ${data.name}: PBR ${pbrStr} | PER ${data.per} | Yield ${data.yield}%`);
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

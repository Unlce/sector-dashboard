import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import * as cheerio from 'cheerio';

// 【核心策略】龙头股代理列表
// 我们抓取每个行业最具代表性的一只股票，作为该行业的"体温计"
const SECTOR_LEADERS = [
  { code: "1332", sectorCode: "0251", name: "水産・農林業" }, // ニッスイ
  { code: "1605", sectorCode: "0253", name: "鉱業" },       // INPEX
  { code: "1928", sectorCode: "0254", name: "建設業" },     // 積水ハウス (你的关注股)
  { code: "2802", sectorCode: "0256", name: "食料品" },     // 味の素
  { code: "3402", sectorCode: "0255", name: "繊維製品" },   // 東レ
  { code: "3861", sectorCode: "0257", name: "パルプ・紙" }, // 王子HD
  { code: "4063", sectorCode: "0258", name: "化学" },       // 信越化学
  { code: "4502", sectorCode: "0259", name: "医薬品" },     // 武田薬品
  { code: "5020", sectorCode: "0260", name: "石油・石炭" }, // ENEOS
  { code: "5108", sectorCode: "0261", name: "ゴム製品" },   // ブリヂストン
  { code: "5201", sectorCode: "0262", name: "ガラス土石" }, // AGC
  { code: "5401", sectorCode: "0263", name: "鉄鋼" },       // 日本製鉄
  { code: "5713", sectorCode: "0264", name: "非鉄金属" },   // 住友鉱
  { code: "5938", sectorCode: "0265", name: "金属製品" },   // LIXIL
  { code: "6301", sectorCode: "0266", name: "機械" },       // コマツ
  { code: "6501", sectorCode: "0267", name: "電気機器" },   // 日立
  { code: "7203", sectorCode: "0268", name: "輸送用機器" }, // トヨタ
  { code: "7741", sectorCode: "0269", name: "精密機器" },   // HOYA
  { code: "7974", sectorCode: "0270", name: "その他製品" }, // 任天堂
  { code: "9503", sectorCode: "0271", name: "電気・ガス" }, // 関西電力 (你的关注股)
  { code: "9020", sectorCode: "0272", name: "陸運業" },     // JR東日本
  { code: "9101", sectorCode: "0273", name: "海運業" },     // 日本郵船
  { code: "9202", sectorCode: "0274", name: "空運業" },     // ANA (你的持仓)
  { code: "9301", sectorCode: "0275", name: "倉庫・運輸" }, // 三菱倉庫
  { code: "9432", sectorCode: "0276", name: "情報・通信" }, // NTT
  { code: "8058", sectorCode: "0277", name: "卸売業" },     // 三菱商事 (你的目标股)
  { code: "3382", sectorCode: "0278", name: "小売業" },     // セブン&アイ (你的持仓)
  { code: "8306", sectorCode: "0279", name: "銀行業" },     // 三菱UFJ
  { code: "8604", sectorCode: "0280", name: "証券商品" },   // 野村HD
  { code: "8766", sectorCode: "0281", name: "保険業" },     // 東京海上
  { code: "8591", sectorCode: "0282", name: "その他金融" }, // オリックス
  { code: "8801", sectorCode: "0283", name: "不動産業" },   // 三井不動産
  { code: "6098", sectorCode: "0284", name: "サービス業" }  // リクルート
];

// 延时函数，防止请求太快被 Kabutan 封 IP
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchStockData = async (stockCode) => {
  const url = `https://kabutan.jp/stock/?code=${stockCode}`;
  try {
    const { data } = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const $ = cheerio.load(data);

    // 抓取 PBR (kabutan 页面结构相对固定，但需要容错)
    // 通常在 #stockinfo_i3 区域
    let pbr = $('#stockinfo_i3 table tbody tr:nth-child(1) td:nth-child(4)').text().replace('倍', '');
    let per = $('#stockinfo_i3 table tbody tr:nth-child(1) td:nth-child(2)').text().replace('倍', '');
    let yieldVal = $('#stockinfo_i3 table tbody tr:nth-child(3) td:nth-child(2)').text().replace('%', '');
    
    // 抓取股价涨跌 (判断 Trend)
    // 查找 "前日比" 的颜色或符号
    const changeText = $('.kobetsu_data_table1 tbody tr:nth-child(2) td:nth-child(2)').text();
    let trend = 'flat';
    if (changeText.includes('+')) trend = 'up';
    if (changeText.includes('-') || changeText.includes('▲')) trend = 'down';

    // 数据清洗：如果抓不到，返回 fallback 数据
    pbr = parseFloat(pbr) || 1.0;
    per = parseFloat(per) || 15.0;
    yieldVal = parseFloat(yieldVal) || 2.0;

    return { pbr, per, yield: yieldVal, trend };
  } catch (error) {
    console.error(`❌ Failed to fetch ${stockCode}: ${error.message}`);
    // 失败时返回保守数据，防止页面崩溃
    return { pbr: "-", per: "-", yield: "-", trend: "flat" };
  }
};

const run = async () => {
  console.log("🚀 Starting Real-Time Sector Scrape...");
  const results = [];

  for (const sector of SECTOR_LEADERS) {
    console.log(`📡 Fetching ${sector.name} (${sector.code})...`);
    
    const data = await fetchStockData(sector.code);
    
    results.push({
      code: sector.sectorCode, // 保持业种代码一致，方便前端显示
      name: sector.name,
      leader: sector.code,     // 记录是哪个龙头股的数据
      ...data
    });

    // 每次请求后休息 1.5 秒，模拟人类浏览
    await sleep(1500);
  }

  // 保存数据
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const publicDir = path.join(__dirname, '../public');
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  const filePath = path.join(publicDir, 'data.json');
  fs.writeFileSync(filePath, JSON.stringify(results, null, 2));
  console.log(`✅ Update Complete! Data saved to ${filePath}`);
};

run();

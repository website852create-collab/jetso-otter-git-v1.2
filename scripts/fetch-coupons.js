// scripts/fetch-coupons.js
// V6: 暴力欄位匹配版 (修復全部變精選商家的問題)
const { createClient } = require('@supabase/supabase-js');

// --- 設定區 ---
// 這兩個值會由 CMD / Vercel 的環境變數提供
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CHINESEAN_TOKEN = '1372181f7957ce41af8ea84e781eff65';
const WEBSITE_ID = '70169';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ [錯誤] 缺少 Supabase 環境變數');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- 核心工具：暴力尋找欄位 ---
// ChineseAN API 的欄位名稱極度混亂，這個函數會嘗試所有可能的 key
function smartGet(item, keys) {
    for (const key of keys) {
        if (item[key] !== undefined && item[key] !== null && item[key] !== '') {
            return item[key];
        }
    }
    return null;
}

function parseDate(dateStr) {
  if (!dateStr || dateStr.length !== 8) return null;
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return new Date(`${year}-${month}-${day}`).toISOString();
}

function getApiDateString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

async function fetchAllPages(baseUrl, contextName) {
  let allItems = [];
  let currentPage = 1;
  let maxPages = 1;

  do {
    const separator = baseUrl.includes('?') ? '&' : '?';
    const url = `${baseUrl}${separator}page=${currentPage}`;

    if (currentPage === 1 || currentPage % 5 === 0) {
      console.log(`   ↳ [${contextName}] 正在抓取第 ${currentPage} 頁...`);
    }

    try {
      const res = await fetch(url);
      const json = await res.json();
      let items = [];

      if (Array.isArray(json)) {
        items = json;
      } else if (json.data && Array.isArray(json.data)) {
        items = json.data;
        maxPages = json.maxPages || 1;
      } else {
        break;
      }
      
      allItems = allItems.concat(items);
      currentPage++;
    } catch (e) {
      console.error(`   ⚠️ [${contextName}] 抓取失敗: ${e.message}`);
      break;
    }
  } while (currentPage <= maxPages);

  return allItems;
}

// --- 主程式 ---
async function main() {
  console.log('🦦 水獺管家 (V6 欄位修復版) 開始工作...');
  
  try {
    const startDate = getApiDateString(-30);
    const endDate = getApiDateString(180);

    // 1. 抓商家 Logo (Program API)
    console.log('📡 步驟 1/3: 抓取商家 Logo...');
    const programUrl = `https://www.chinesean.com/api/programs.do?token=${CHINESEAN_TOKEN}&websiteId=${WEBSITE_ID}&programType=cpa`;
    const programs = await fetchAllPages(programUrl, '商家資料');
    
    const logoMap = {};
    const nameToLogoMap = {};
    
    programs.forEach(p => {
        // 嘗試各種 Logo 寫法
        const logo = smartGet(p, ['ProgramLogo', 'programLogo', 'Logo', 'logo']);
        const pid = smartGet(p, ['ProgramID', 'programId', 'Id', 'id']);
        // 嘗試各種 Name 寫法
        const name = smartGet(p, ['OfferName', 'Offer_Name', 'Offer_Name(TC)', 'programName', 'programName_zh_hk']);
        
        if (logo) {
            if (pid) logoMap[pid.toString()] = logo;
            if (name) nameToLogoMap[name] = logo;
        }
    });

    // 2. 抓優惠券 (Promotion API)
    console.log('📡 步驟 2/3: 抓取優惠券資料...');
    // 注意: 移除了 isValid=Y，有時候這個參數會過濾掉太多東西，我們自己濾
    const promoUrl = `https://www.chinesean.com/api/promotionInfo.do?token=${CHINESEAN_TOKEN}&websiteId=${WEBSITE_ID}&language=zh-CHT&startDate=${startDate}&endDate=${endDate}`;
    const promotions = await fetchAllPages(promoUrl, '優惠券');
    
    if (promotions.length > 0) {
        console.log('\n🔍 [DEBUG] 檢查第一筆回傳資料的欄位 (請確認這些欄位名):');
        const first = promotions[0];
        console.log(JSON.stringify(first, null, 2));
        console.log('--------------------------------------------------\n');
    }

    // 3. 寫入資料庫
    console.log('💾 步驟 3/3: 寫入資料庫...');
    
    const seenIds = new Set();
    let upsertBuffer = [];
    let successCount = 0;
    const BATCH_SIZE = 50;

    for (const p of promotions) {
      const extId = smartGet(p, ['promotionId', 'PromotionId', 'id'])?.toString();
      
      if (!extId || seenIds.has(extId)) continue;
      seenIds.add(extId);

      // --- 關鍵修復：暴力匹配欄位 ---
      
      // 1. 商家名稱 (優先找繁體中文，再來是英文/一般)
      const merchantName = smartGet(p, [
          'programName_zh_hk', // 最優先：香港繁體
          'programName_zh_cn', 
          'programName', 
          'ProgramName', 
          'programName_en',
          'OfferName'
      ]) || '未知商家'; // 真的找不到才用這個

      // 2. 標題
      let title = smartGet(p, [
          'promotionTitle_zh_hk',
          'promotionTitle',
          'PromotionTitle',
          'title'
      ]);

      // 如果標題還是空，就組合一個
      if (!title || title.trim() === '') {
          title = `${merchantName} 優惠`;
      }

      // 3. 描述
      const desc = smartGet(p, ['description', 'Description', 'note']);

      // 4. 找 Logo
      const pId = smartGet(p, ['programId', 'ProgramId']);
      const logo = logoMap[pId] || nameToLogoMap[merchantName] || null;

      // 5. 連結 (必填)
      let trackingUrl = null;
      if (p.couponLinkInfo && Array.isArray(p.couponLinkInfo) && p.couponLinkInfo.length > 0) {
          trackingUrl = p.couponLinkInfo[0].trackingUrl;
      }

      if (!trackingUrl) continue;

      upsertBuffer.push({
        external_id: extId,
        title: title,
        merchant_name: merchantName,
        merchant_logo: logo,
        description: desc || '',
        tracking_url: trackingUrl,
        code: p.couponCodeInfo?.[0]?.coupon || null,
        category: p.category || '精選',
        start_date: parseDate(p.startDate),
        end_date: parseDate(p.endDate),
        image_url: p.couponBannerInfo?.[0] || null,
        is_active: true,
        updated_at: new Date().toISOString()
      });

      if (upsertBuffer.length >= BATCH_SIZE) {
        const { error } = await supabase.from('coupons').upsert(upsertBuffer, { onConflict: 'external_id' });
        if (error) console.error('❌ 寫入錯誤:', error.message);
        else {
            successCount += upsertBuffer.length;
            process.stdout.write('.');
        }
        upsertBuffer = [];
      }
    }

    if (upsertBuffer.length > 0) {
      const { error } = await supabase.from('coupons').upsert(upsertBuffer, { onConflict: 'external_id' });
      if (!error) successCount += upsertBuffer.length;
    }

    console.log(`\n🎉 完成！成功寫入 ${successCount} 筆資料。`);
    console.log(`(如果 merchant_name 還是 '未知商家'，請把上面的 DEBUG Log 貼給工程師)`);

  } catch (err) {
    console.error('\n💥 錯誤:', err);
  }
}

main();
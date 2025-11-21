// scripts/fetch-coupons.js
// V7: 環境變數整合 + V6 欄位修復版
// 執行指令: node scripts/fetch-coupons.js

// 嘗試讀取 .env.local 檔案
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

// 1. 從環境變數讀取設定
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // 注意：這裡必須用 Service Role Key 才能寫入
const CHINESEAN_TOKEN = process.env.CHINESEAN_TOKEN;
const WEBSITE_ID = process.env.CHINESEAN_WEBSITE_ID;

// 檢查變數是否存在
if (!SUPABASE_URL || !SUPABASE_KEY || !CHINESEAN_TOKEN || !WEBSITE_ID) {
  console.error('❌ [錯誤] 缺少必要的環境變數。');
  console.error('請確認 .env.local 檔案包含：');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  console.error('- CHINESEAN_TOKEN');
  console.error('- CHINESEAN_WEBSITE_ID');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- 工具函數 ---

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

async function main() {
  console.log('🦦 水獺管家 (V7 環境變數版) 開始工作...');
  console.log(`ℹ️  使用 Website ID: ${WEBSITE_ID}`);

  try {
    const startDate = getApiDateString(-30);
    const endDate = getApiDateString(180);

    // --- 1. 抓取 Logo 對照表 ---
    console.log('📡 1. 建立商家 Logo 資料庫...');
    const programUrl = `https://www.chinesean.com/api/programs.do?token=${CHINESEAN_TOKEN}&websiteId=${WEBSITE_ID}&programType=cpa`;
    const programs = await fetchAllPages(programUrl, '商家資料');
    
    const logoMap = {}; // ID -> Logo
    const nameMap = {}; // Name -> Logo

    programs.forEach(p => {
      const logo = p.ProgramLogo || p.programLogo || p.Logo || p.logo;
      if (!logo) return;

      const pid = p.ProgramID || p.programId || p.ProgramId;
      if (pid) logoMap[pid.toString()] = logo;

      const names = [
        p.OfferName, p.ProgramName, p.programName, 
        p['Offer_Name(TC)'], p['Offer_Name(SC)'], p['Offer_Name(EN)'],
        p.programName_zh_hk, p.programName_zh_cn
      ];
      names.forEach(n => {
        if (n) nameMap[n] = logo;
      });
    });
    console.log(`✅ 商家資料庫建立完成`);


    // --- 2. 抓取優惠券 ---
    console.log('📡 2. 下載優惠券資料...');
    const promoUrl = `https://www.chinesean.com/api/promotionInfo.do?token=${CHINESEAN_TOKEN}&websiteId=${WEBSITE_ID}&language=zh-CHT&isValid=Y&startDate=${startDate}&endDate=${endDate}`;
    const promotions = await fetchAllPages(promoUrl, '優惠券');
    
    if (promotions.length > 0) {
        // [DEBUG] 檢查是否有我們需要的欄位
        console.log('🔍 [DEBUG] 檢查第一筆資料:', JSON.stringify(promotions[0]).substring(0, 150) + '...');
    }

    // --- 3. 寫入資料庫 ---
    console.log('💾 3. 開始寫入...');
    
    const seenIds = new Set();
    let upsertBuffer = [];
    let successCount = 0;

    for (const p of promotions) {
      const extId = p.promotionId.toString();
      if (seenIds.has(extId)) continue;
      seenIds.add(extId);

      // [修復] 商家名稱匹配
      let rawName = 
        p.programName_zh_hk || 
        p.programName_zh_cn || 
        p.programName_en || 
        p.programName || 
        p.ProgramName || 
        p.OfferName || 
        '精選商家';
      const merchantName = rawName.trim();

      // [修復] 標題匹配
      let rawTitle = 
        p.promotionTitle || 
        p.PromotionTitle || 
        p.title || 
        '';
      let title = rawTitle.trim();
      if (!title) title = `${merchantName} 限時優惠`;

      // Logo 匹配
      let logo = logoMap[p.programId] || nameMap[merchantName] || null;

      const trackingUrl = p.couponLinkInfo?.[0]?.trackingUrl;
      if (!trackingUrl) continue;

      upsertBuffer.push({
        external_id: extId,
        title: title,
        merchant_name: merchantName,
        merchant_logo: logo,
        description: p.description || '',
        tracking_url: trackingUrl,
        code: p.couponCodeInfo?.[0]?.coupon || null,
        category: p.category || '其他',
        start_date: parseDate(p.startDate),
        end_date: parseDate(p.endDate),
        image_url: p.couponBannerInfo?.[0] || null,
        is_active: true,
        updated_at: new Date().toISOString()
      });

      if (upsertBuffer.length >= 50) {
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

    console.log(`\n🎉 完成！成功更新 ${successCount} 筆資料。`);

  } catch (err) {
    console.error('\n💥 錯誤:', err);
    process.exit(1);
  }
}

main();
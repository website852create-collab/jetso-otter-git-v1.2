// scripts/fetch-coupons.js
// 執行方式: node scripts/fetch-coupons.js
const { createClient } = require('@supabase/supabase-js');

// 1. 設定參數 (從環境變數讀取)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // 注意：這裡需要 Service Role Key 才能寫入
const CHINESEAN_TOKEN = '1372181f7957ce41af8ea84e781eff65';
const WEBSITE_ID = '70169';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ 錯誤: 缺少 Supabase 環境變數 (URL 或 SERVICE_ROLE_KEY)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 輔助函數：解析 yyyyMMdd 格式日期
function parseDate(dateStr) {
  if (!dateStr || dateStr.length !== 8) return null;
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return new Date(`${year}-${month}-${day}`).toISOString();
}

async function fetchAndSync() {
  try {
    console.log('🦦 水獺管家開始工作...');

    // --- 步驟 1: 抓取商家資料 (為了拿 Logo) ---
    console.log('📡 正在抓取商家 Logo 資料 (Program API)...');
    const programUrl = `https://www.chinesean.com/api/programs.do?token=${CHINESEAN_TOKEN}&websiteId=${WEBSITE_ID}&programType=cpa`; // 假設主要是 CPA
    const programRes = await fetch(programUrl);
    const programs = await programRes.json();
    
    // 建立商家 Logo 對照表 (Key: 商家名稱, Value: Logo URL)
    const logoMap = {};
    if (Array.isArray(programs)) {
      programs.forEach(p => {
        // 比對邏輯：使用 OfferName 或 ProgramName
        if (p.OfferName) logoMap[p.OfferName] = p.ProgramLogo;
        if (p.ProgramName) logoMap[p.ProgramName] = p.ProgramLogo;
      });
    }
    console.log(`✅ 取得 ${programs.length || 0} 筆商家資料`);

    // --- 步驟 2: 抓取優惠券資料 ---
    console.log('📡 正在抓取優惠券資料 (Promotion API)...');
    const promoUrl = `https://www.chinesean.com/api/promotionInfo.do?token=${CHINESEAN_TOKEN}&websiteId=${WEBSITE_ID}&language=zh-CHT&isValid=Y`;
    const promoRes = await fetch(promoUrl);
    const promotions = await promoRes.json();

    if (!Array.isArray(promotions)) {
      throw new Error('API 回傳格式錯誤，預期為陣列');
    }

    console.log(`📦 收到 ${promotions.length} 筆優惠券，準備寫入資料庫...`);

    // --- 步驟 3: 資料轉換與寫入 ---
    let successCount = 0;
    
    for (const p of promotions) {
      // 欄位對應邏輯
      const merchantName = p.programName || '未知商家';
      const logo = logoMap[merchantName] || logoMap[p.programId] || null; // 嘗試匹配 Logo
      
      // 取出第一張 Banner 圖片 (如果有的話)
      const imageUrl = (p.couponBannerInfo && p.couponBannerInfo.length > 0) 
        ? p.couponBannerInfo[0] 
        : null;

      // 取出 trackingUrl
      const trackingUrl = (p.couponLinkInfo && p.couponLinkInfo.length > 0)
        ? p.couponLinkInfo[0].trackingUrl
        : null;

      // 取出折扣碼 (如果有的話)
      const code = (p.couponCodeInfo && p.couponCodeInfo.length > 0)
        ? p.couponCodeInfo[0].coupon
        : null;

      if (!trackingUrl) continue; // 沒有連結就跳過

      const couponData = {
        external_id: p.promotionId.toString(),
        title: p.promotionTitle,
        merchant_name: merchantName,
        merchant_logo: logo,
        description: p.description,
        tracking_url: trackingUrl,
        code: code,
        category: p.category,
        start_date: parseDate(p.startDate),
        end_date: parseDate(p.endDate),
        image_url: imageUrl,
        language: 'zh-CHT',
        is_active: true,
        updated_at: new Date().toISOString()
      };

      // Upsert: 如果 external_id 存在則更新，否則新增
      const { error } = await supabase
        .from('coupons')
        .upsert(couponData, { onConflict: 'external_id' });

      if (error) {
        console.error(`❌ 寫入失敗 ID ${p.promotionId}:`, error.message);
      } else {
        successCount++;
      }
    }

    console.log(`🎉 同步完成！成功更新/新增 ${successCount} 筆優惠券。`);

  } catch (err) {
    console.error('💥 發生致命錯誤:', err);
    process.exit(1);
  }
}

fetchAndSync();
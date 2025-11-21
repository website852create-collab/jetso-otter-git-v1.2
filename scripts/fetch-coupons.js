// scripts/fetch-coupons.js
const { createClient } = require('@supabase/supabase-js');

// 從環境變數讀取設定
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY; // 注意：這裡要用 Service Role Key 才能寫入
const CHINESEAN_TOKEN = process.env.CHINESEAN_TOKEN;
const CHINESEAN_ID = process.env.CHINESEAN_WEBSITE_ID;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchCoupons() {
  console.log('開始抓取 ChineseAN 優惠...');
  
  // 使用新版 Promotion Info API
  const startDate = '20251021';
  const endDate = '20251221';
  const apiUrl = `https://www.chinesean.com/api/promotionInfo.do?websiteId=${CHINESEAN_ID}&token=${CHINESEAN_TOKEN}&format=json&startDate=${startDate}&endDate=${endDate}`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    console.log('API 回傳原始內容:', JSON.stringify(data, null, 2));

    // 嘗試自動判斷資料陣列位置
    let coupons = Array.isArray(data) ? data : (Array.isArray(data.result) ? data.result : (Array.isArray(data.data) ? data.data : []));

    if (!coupons.length) {
      console.error('API 回傳格式錯誤或無資料');
      return;
    }

    console.log(`取得 ${coupons.length} 筆資料，開始寫入資料庫...`);

    for (const item of coupons) {
      // 取商家名稱（優先繁體）
      const merchantName = item.programName_zh_hk || item.programName_en_us || item.programName_zh_cn || '';
      // 取標題（優先繁體）
      const title = item.promotionTitle_zh_hk || item.promotionTitle_en_us || item.promotionTitle_zh_cn || '';
      // 取描述（優先繁體）
      const description = item.description_zh_hk || item.description_en_us || item.description_zh_cn || '';
      // 取追蹤連結（優先 couponLinkInfo[0]）
      const trackingUrl = Array.isArray(item.couponLinkInfo) && item.couponLinkInfo[0] ? item.couponLinkInfo[0].trackingUrl : '';
      // 取 program logo，只取 fileInfo 中第一個圖片檔
      let imageUrl = '';
      if (Array.isArray(item.fileInfo)) {
        const img = item.fileInfo.find(f => /\.(png|jpe?g|webp)$/i.test(f.filePath));
        if (img) imageUrl = img.filePath;
      }
      // 取開始/結束時間（優先 promotionTime_zh_hk）
      let startDate = '', endDate = '';
      if (item.promotionTime_zh_hk) {
        const match = item.promotionTime_zh_hk.match(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) To (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
        if (match) {
          startDate = match[1];
          endDate = match[2];
        }
      }

      // 多個 couponCodeInfo，每個 code 一筆 row
      const codeList = Array.isArray(item.couponCodeInfo) && item.couponCodeInfo.length > 0 ? item.couponCodeInfo : [{ id: item.promotionId, coupon: null }];
      for (const codeInfo of codeList) {
        const couponId = codeInfo.id || item.promotionId;
        const couponCode = codeInfo.coupon || null;
        const couponData = {
          id: couponId,
          title,
          merchant_name: merchantName,
          description,
          tracking_url: trackingUrl,
          code: couponCode,
          start_date: startDate,
          end_date: endDate,
          image_url: imageUrl,
          is_active: true
        };
        // Upsert: 如果 ID 存在則更新，不存在則新增
        const { error } = await supabase
          .from('coupons')
          .upsert(couponData);
        if (error) console.error('寫入錯誤:', error.message);
      }
    }
    console.log('更新完成！');

  } catch (err) {
    console.error('抓取失敗:', err);
    process.exit(1);
  }
}

fetchCoupons();
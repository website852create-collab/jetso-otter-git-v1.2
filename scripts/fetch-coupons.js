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
  
  // 根據文件構建 URL (範例，需根據實際文件調整參數)
  // 假設使用 Get Coupon List 接口
  const apiUrl = `https://api.chinesean.com/affiliate/getCouponList.php?websiteId=${CHINESEAN_ID}&token=${CHINESEAN_TOKEN}&format=json`;

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!data || !Array.isArray(data)) {
      console.error('API 回傳格式錯誤或無資料');
      return;
    }

    console.log(`取得 ${data.length} 筆資料，開始寫入資料庫...`);

    for (const item of data) {
      // 資料清洗與對應
      const couponData = {
        id: parseInt(item.Id), // 確保 ID 格式正確
        title: item.Name,
        merchant_name: item.ProgramName,
        description: item.Description,
        tracking_url: item.TrackingUrl,
        code: item.CouponCode || null,
        start_date: item.StartDate,
        end_date: item.EndDate,
        image_url: item.Logo, // 如果有的話
        is_active: true
      };

      // Upsert: 如果 ID 存在則更新，不存在則新增
      const { error } = await supabase
        .from('coupons')
        .upsert(couponData);

      if (error) console.error('寫入錯誤:', error.message);
    }
    console.log('更新完成！');

  } catch (err) {
    console.error('抓取失敗:', err);
    process.exit(1);
  }
}

fetchCoupons();
// scripts/fetch-coupons.js
// V5 終極版: 自動去重 + ID匹配Logo + 強制標題修復
const { createClient } = require('@supabase/supabase-js');

// 1. 設定參數
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CHINESEAN_TOKEN = '1372181f7957ce41af8ea84e781eff65';
const WEBSITE_ID = '70169';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ 錯誤: 缺少 Supabase 環境變數');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 日期格式化
function parseDate(dateStr) {
  if (!dateStr || dateStr.length !== 8) return null;
  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);
  return new Date(`${year}-${month}-${day}`).toISOString();
}

// API 查詢日期格式 (yyyyMMdd)
function getApiDateString(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// 通用分頁抓取函數
async function fetchAllPages(baseUrl, name) {
    let allItems = [];
    let currentPage = 1;
    let maxPages = 1;

    do {
        const separator = baseUrl.includes('?') ? '&' : '?';
        const url = `${baseUrl}${separator}page=${currentPage}`;
        
        if (currentPage === 1 || currentPage % 5 === 0) {
            console.log(`   ↳ 正在抓取 ${name} 第 ${currentPage} 頁...`);
        }
        
        try {
            const res = await fetch(url);
            const json = await res.json();
            let items = [];
            
            // 根據文件: 回傳結構可能是 { data: [...] } 或直接 [...]
            if (Array.isArray(json)) {
                items = json;
            } else if (json.data && Array.isArray(json.data)) {
                items = json.data;
                maxPages = json.maxPages || 1;
            } else {
                // 沒資料或格式不符
                break;
            }

            allItems = allItems.concat(items);
            currentPage++;
        } catch (e) {
            console.error(`   ⚠️ 抓取第 ${currentPage} 頁失敗:`, e.message);
            break;
        }
    } while (currentPage <= maxPages);

    return allItems;
}

async function fetchAndSync() {
  try {
    console.log('🦦 水獺管家 (V5 終極版) 開始工作...');
    
    // 記錄本次執行已處理過的 ID，防止 API 回傳重複資料導致 SQL 錯誤
    const processedIds = new Set(); 

    // 日期範圍
    const apiStartDate = getApiDateString(-30); 
    const apiEndDate = getApiDateString(180);

    // --- 步驟 1: 抓取商家 Logo (Program Info API) ---
    console.log('📡 正在抓取商家資料 (建立 Logo 對照表)...');
    // 根據文件，Program API 需要 token 和 websiteId
    const programBaseUrl = `https://www.chinesean.com/api/programs.do?token=${CHINESEAN_TOKEN}&websiteId=${WEBSITE_ID}&programType=cpa`;
    const programs = await fetchAllPages(programBaseUrl, '商家資料');
    
    const logoMap = {}; // Key: ProgramID, Value: LogoURL
    const nameToLogoMap = {}; // Key: Name, Value: LogoURL (備用)

    programs.forEach(p => {
        // 根據文件 3.1.2 JSON Contents: ProgramLogo, ProgramID
        const logoUrl = p.ProgramLogo || p.programLogo; 
        const pId = p.ProgramID || p.programId;
        
        if (logoUrl) {
            if (pId) logoMap[pId.toString()] = logoUrl;
            
            // 建立名稱備用對應 (支援繁中/簡中/英文)
            if (p['Offer_Name(TC)']) nameToLogoMap[p['Offer_Name(TC)']] = logoUrl;
            if (p['Offer_Name(SC)']) nameToLogoMap[p['Offer_Name(SC)']] = logoUrl;
            if (p['Offer_Name(EN)']) nameToLogoMap[p['Offer_Name(EN)']] = logoUrl;
            if (p.programName) nameToLogoMap[p.programName] = logoUrl;
        }
    });
    console.log(`✅ Logo 對照表建立完成 (ID對應: ${Object.keys(logoMap).length} 筆)`);


    // --- 步驟 2: 抓取優惠券 (Promotion Info API) ---
    console.log('📡 正在抓取優惠券資料...');
    // 根據文件 1. Promotion Info API，必需參數包含 token, websiteId
    const promoBaseUrl = `https://www.chinesean.com/api/promotionInfo.do?token=${CHINESEAN_TOKEN}&websiteId=${WEBSITE_ID}&language=zh-CHT&isValid=Y&startDate=${apiStartDate}&endDate=${apiEndDate}`;
    const promotions = await fetchAllPages(promoBaseUrl, '優惠券');
    console.log(`📦 原始資料共 ${promotions.length} 筆`);

    // --- 步驟 3: 資料清洗、去重與寫入 ---
    const BATCH_SIZE = 50;
    let successCount = 0;

    // 準備整批資料
    let pendingUpsert = [];

    for (const p of promotions) {
        const pId = p.promotionId.toString();

        // [關鍵修正] 去重檢查：如果這個 ID 已經在這一次執行中處理過，直接跳過
        if (processedIds.has(pId)) {
            continue;
        }
        processedIds.add(pId);

        // 1. 商家名稱與 Logo
        // Promotion API 回傳 programId, programName
        const merchantName = p.programName || '精選商家';
        // 優先用 ID 對應 Logo，沒有才用名稱
        const logo = logoMap[p.programId] || nameToLogoMap[merchantName] || null;

        // 2. 標題修復 (防止 null 錯誤)
        let cleanTitle = p.promotionTitle;
        if (!cleanTitle || cleanTitle.trim() === '') {
            cleanTitle = `${merchantName} 限時優惠`;
        }

        // 3. 欄位提取
        const imageUrl = (p.couponBannerInfo && p.couponBannerInfo.length > 0) ? p.couponBannerInfo[0] : null;
        const trackingUrl = (p.couponLinkInfo && p.couponLinkInfo.length > 0) ? p.couponLinkInfo[0].trackingUrl : null;
        const code = (p.couponCodeInfo && p.couponCodeInfo.length > 0) ? p.couponCodeInfo[0].coupon : null;

        if (!trackingUrl) continue;

        pendingUpsert.push({
            external_id: pId,
            title: cleanTitle,
            merchant_name: merchantName,
            merchant_logo: logo,
            description: p.description || '',
            tracking_url: trackingUrl,
            code: code,
            category: p.category || '其他',
            start_date: parseDate(p.startDate),
            end_date: parseDate(p.endDate),
            image_url: imageUrl,
            language: 'zh-CHT',
            is_active: true,
            updated_at: new Date().toISOString()
        });

        // 當累積到 BATCH_SIZE，執行寫入
        if (pendingUpsert.length >= BATCH_SIZE) {
            const { error } = await supabase.from('coupons').upsert(pendingUpsert, { onConflict: 'external_id' });
            if (error) {
                console.error(`❌ 批次寫入失敗:`, error.message);
            } else {
                successCount += pendingUpsert.length;
                process.stdout.write(`.`);
            }
            pendingUpsert = []; // 清空陣列
        }
    }

    // 寫入剩下的資料
    if (pendingUpsert.length > 0) {
        const { error } = await supabase.from('coupons').upsert(pendingUpsert, { onConflict: 'external_id' });
        if (error) {
            console.error(`❌ 最後批次寫入失敗:`, error.message);
        } else {
            successCount += pendingUpsert.length;
        }
    }

    console.log(`\n🎉 全部完成！資料庫已更新 ${successCount} 筆優惠券。`);

  } catch (err) {
    console.error('\n💥 發生未預期錯誤:', err);
    process.exit(1);
  }
}

fetchAndSync();
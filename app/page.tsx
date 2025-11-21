import { createClient } from '@supabase/supabase-js';
import CouponCard from '@/components/CouponCard';

// 1. 初始化 Supabase (使用公開 Key)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 2. 設定 ISR (每 1 小時更新一次頁面)
export const revalidate = 3600; 

export default async function Home() {
  console.log("正在從 Supabase 讀取優惠券...");

  // 3. 從 View 讀取資料 (View 已經幫我們過濾好日期了)
  const { data: coupons, error } = await supabase
    .from('active_coupons_range')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error("❌ 讀取失敗:", error);
    return <div className="p-10 text-center text-red-500">資料載入發生錯誤，請稍後再試。</div>;
  }

  // 4. 提取所有分類 (用於顯示過濾器按鈕)
  const categories = Array.from(new Set(coupons?.map(c => c.category).filter(Boolean)));

  return (
    <div className="space-y-8">
      {/* Hero 區域 */}
      <section className="text-center py-12 bg-amber-50 rounded-3xl border border-amber-100">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
          發現最新網購優惠
        </h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          水獺為你收集了 {coupons?.length || 0} 個有效的優惠碼。
        </p>
      </section>

      {/* 分類過濾器 */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <span 
              key={cat} 
              className="px-4 py-1 bg-white border border-gray-200 rounded-full text-sm text-gray-600 whitespace-nowrap"
            >
              {cat}
            </span>
          ))}
        </div>
      )}

      {/* 優惠券列表 */}
      {coupons && coupons.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coupons.map((coupon) => (
            <CouponCard key={coupon.id} coupon={coupon} />
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-20 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-2xl mb-2">📭</p>
          <p>目前沒有優惠券，請先確認後台腳本是否已執行。</p>
        </div>
      )}
    </div>
  );
}
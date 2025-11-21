import { createClient } from '@supabase/supabase-js';
import CouponCard from '@/components/CouponCard';

// 初始化 Supabase Client (使用公開 Key 即可，因為是讀取)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 讓頁面每 1 小時重新生成一次 (ISR)
export const revalidate = 3600; 

export default async function Home() {
  // 從 Supabase 抓取有效優惠券
  const { data: coupons, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching coupons:", error);
    return <div>載入失敗，請稍後再試。</div>;
  }

  // 取得唯一分類
  const categories = Array.from(new Set(coupons?.map(c => c.category).filter(Boolean)));

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="text-center py-12 bg-gradient-to-b from-otter-100 to-otter-50 rounded-3xl shadow-inner">
        <h2 className="text-3xl md:text-4xl font-bold text-otter-800 mb-4">
          發現最新網購優惠
        </h2>
        <p className="text-otter-600 max-w-2xl mx-auto">
          我們像水獺收集石頭一樣，為你收集了 {coupons?.length || 0} 個有效的優惠碼。
        </p>
      </section>

      {/* Filters (簡單版) */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((cat) => (
            <span 
              key={cat} 
              className="px-4 py-1 bg-white border border-otter-200 rounded-full text-sm text-otter-600 whitespace-nowrap"
            >
              {cat}
            </span>
          ))}
        </div>
      )}

      {/* Coupons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coupons?.map((coupon) => (
          <CouponCard key={coupon.id} coupon={coupon} />
        ))}
      </div>
      
      {coupons?.length === 0 && (
        <div className="text-center text-otter-500 py-12">
          目前沒有優惠券，水獺正在睡覺...💤
        </div>
      )}
    </div>
  );
}
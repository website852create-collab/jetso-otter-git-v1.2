import { createClient } from '@supabase/supabase-js'
import { Search, ExternalLink, Copy, Tag } from 'lucide-react'

// 建立 Supabase 客戶端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default async function Home() {
  // 從 Supabase 抓取優惠券資料
  const { data: coupons, error } = await supabase
    .from('coupons')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Supabase 查詢錯誤:', error)
  }

  return (
    <main className="min-h-screen bg-brand-cream font-sans text-brand-dark">
      {/* Navbar */}
      <nav className="px-6 py-4 flex justify-between items-center max-w-6xl mx-auto">
        <div className="flex items-center gap-2 font-bold text-2xl text-brand-brown">
          <span>🦦 Jetso Otter</span>
        </div>
        <button className="px-4 py-2 rounded-full border-2 border-brand-brown text-brand-brown hover:bg-brand-brown hover:text-white transition">
          訂閱優惠
        </button>
      </nav>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 py-12 md:py-20 text-center md:text-left flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1">
          <h1 className="text-4xl md:text-6xl font-extrabold text-brand-brown mb-4 leading-tight">
            幫你咬住 <br/>
            <span className="text-brand-orange">最筍優惠</span>
          </h1>
          <p className="text-lg text-brand-dark/80 mb-8">
            Jetso Otter 每天為你游遍全網，蒐集最新的 Promo Code 與折扣優惠。不花冤枉錢，購物更快樂！
          </p>
          
          {/* Search Bar */}
          <div className="relative max-w-md mx-auto md:mx-0 shadow-lg rounded-full">
            <input 
              type="text" 
              placeholder="搜尋商家 (例如: Nike, iHerb...)" 
              className="w-full pl-12 pr-4 py-4 rounded-full border-2 border-brand-brown/20 focus:border-brand-brown focus:outline-none bg-white"
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-brown/50" size={20} />
          </div>
        </div>
        
        {/* Character Image - 暫時用 emoji，之後替換成真圖 */}
        <div className="flex-1 flex justify-center items-center text-9xl">
          🦦
        </div>
      </section>

      {/* Coupons Grid */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-bold text-brand-dark">🔥 熱門優惠</h2>
          <a href="#" className="text-brand-brown underline decoration-2 underline-offset-4">查看全部</a>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            無法載入優惠資料：{error.message}
          </div>
        )}

        {!coupons || coupons.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-2xl text-brand-brown mb-4">🦦 水獺還在努力搜羅優惠...</p>
            <p className="text-gray-600">資料庫暫時沒有優惠，請稍後再來！</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coupons.map((coupon: any) => (
              <div 
                key={coupon.id} 
                className="bg-white rounded-2xl overflow-hidden shadow-md border border-brand-brown/10 hover:shadow-xl hover:-translate-y-1 transition duration-300 flex flex-col"
              >
                {/* 優惠圖片（如果有） */}
                {coupon.image_url && (
                  <div className="w-full h-40 bg-gray-100 relative">
                    <img 
                      src={coupon.image_url} 
                      alt={coupon.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* 卡片內容 */}
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-gray-100 px-3 py-1 rounded-lg font-bold text-sm text-gray-600">
                      {coupon.merchant_name || '未知商家'}
                    </div>
                    {coupon.code ? (
                      <span className="bg-brand-orange/10 text-brand-orange px-2 py-1 rounded text-xs font-bold border border-brand-orange/20 flex items-center gap-1">
                        <Tag size={12} />
                        需折扣碼
                      </span>
                    ) : (
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
                        直接折扣
                      </span>
                    )}
                  </div>
                  
                  <h3 className="font-bold text-lg mb-2 line-clamp-2">{coupon.title}</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    有效期至: {coupon.end_date || '長期有效'}
                  </p>
                  
                  {/* 按鈕區 */}
                  <div className="mt-auto pt-4 border-t border-dashed border-gray-200 flex justify-between gap-3">
                    {coupon.code && (
                      <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex justify-between items-center text-sm font-mono text-gray-600 cursor-pointer hover:bg-gray-100">
                        <span>{coupon.code}</span>
                        <Copy size={14} />
                      </div>
                    )}
                    <a 
                      href={coupon.tracking_url || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className={`${!coupon.code ? 'w-full' : 'flex-1'} py-2 rounded-lg font-bold text-center text-sm flex items-center justify-center gap-1 bg-brand-brown text-white hover:bg-brand-dark transition`}
                    >
                      去購物 <ExternalLink size={14}/>
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="bg-brand-dark text-brand-cream py-12 mt-12 text-center">
        <p className="opacity-50 text-sm">© 2025 Jetso Otter. All rights reserved.</p>
      </footer>
    </main>
  )
}


'use client';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function Page() {
  const { data, error } = await supabase.from('coupons').select('*');
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-black p-8 font-sans">
      <h1 className="text-3xl font-bold mb-8 text-black dark:text-zinc-50">Jetso Otter 優惠券列表</h1>
      {error && <p className="text-red-500">出錯：{error.message}</p>}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {data?.map(coupon => (
          <div key={coupon.id} className="bg-white dark:bg-zinc-900 rounded-xl shadow p-6 flex flex-col gap-2 border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-semibold text-black dark:text-zinc-50">{coupon.title} <span className="text-base font-normal text-zinc-500">({coupon.merchant_name})</span></h2>
            <p className="text-zinc-700 dark:text-zinc-300">{coupon.description}</p>
            {coupon.image_url && (
              <img src={coupon.image_url} alt={coupon.merchant_name} className="w-full h-32 object-contain my-2 bg-zinc-100 rounded" />
            )}
            <div className="flex flex-wrap gap-2 text-sm text-zinc-500">
              {coupon.code && <span className="px-2 py-1 bg-zinc-200 dark:bg-zinc-800 rounded">優惠碼：{coupon.code}</span>}
              <span>有效期：{coupon.start_date} ~ {coupon.end_date}</span>
            </div>
            <a href={coupon.tracking_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">領取優惠</a>
          </div>
        ))}
      </div>
    </main>
  );
}

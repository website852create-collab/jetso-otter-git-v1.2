'use client';

import { useState } from 'react';
import Image from 'next/image';

interface CouponProps {
  coupon: any;
}

export default function CouponCard({ coupon }: CouponProps) {
  const [isCopied, setIsCopied] = useState(false);

  const handleGetDeal = () => {
    if (coupon.code) {
      navigator.clipboard.writeText(coupon.code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
    // 在新分頁開啟連結
    window.open(coupon.tracking_url, '_blank');
  };

  // 處理日期顯示
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '長期有效';
    return new Date(dateStr).toLocaleDateString('zh-HK');
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-otter-100 overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col">
      <div className="p-5 flex-1">
        <div className="flex items-start justify-between mb-4">
          {/* 商家 Logo 或名稱縮寫 */}
          <div className="w-12 h-12 relative rounded-full bg-otter-50 flex items-center justify-center overflow-hidden border border-otter-100">
             {coupon.merchant_logo ? (
               <img src={coupon.merchant_logo} alt={coupon.merchant_name} className="w-full h-full object-contain" />
             ) : (
               <span className="text-xs font-bold text-otter-400">{coupon.merchant_name.slice(0, 2)}</span>
             )}
          </div>
          <span className="text-xs bg-otter-100 text-otter-700 px-2 py-1 rounded-md">
            {coupon.category || '精選'}
          </span>
        </div>

        <h3 className="font-bold text-lg text-otter-900 mb-2 line-clamp-2">
          {coupon.title}
        </h3>
        <p className="text-sm text-otter-500 line-clamp-2 mb-4">
          {coupon.description}
        </p>

        <div className="text-xs text-otter-400 flex items-center gap-1">
          🕒 有效期至: {formatDate(coupon.end_date)}
        </div>
      </div>

      {/* Footer Action */}
      <div className="p-4 bg-otter-50 border-t border-otter-100">
        <button
          onClick={handleGetDeal}
          className="w-full py-2.5 rounded-xl font-bold text-white transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm hover:shadow-md bg-accent-500 hover:bg-accent-600"
        >
          {isCopied ? '已複製代碼！' : (coupon.code ? `獲取代碼: ${coupon.code}` : '立即購買')}
          {!isCopied && <span className="text-lg">→</span>}
        </button>
      </div>
    </div>
  );
}
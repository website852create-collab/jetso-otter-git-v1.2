'use client';

import { useState } from 'react';

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
    window.open(coupon.tracking_url, '_blank');
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '長期有效';
    return new Date(dateStr).toLocaleDateString('zh-HK');
  };

  return (
    // 改用 border-otter-200 增加邊框可見度，bg-white 確保卡片本身是白的
    <div className="bg-white rounded-2xl border border-otter-200 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col h-full overflow-hidden group">
      
      <div className="p-5 flex-1">
        {/* Header: Logo & Category */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-14 h-14 relative rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center overflow-hidden p-1">
             {coupon.merchant_logo ? (
               <img 
                src={coupon.merchant_logo} 
                alt={coupon.merchant_name} 
                className="w-full h-full object-contain" 
                onError={(e) => e.currentTarget.style.display = 'none'}
               />
             ) : (
               <span className="text-xl">🛍️</span>
             )}
          </div>
          <span className="text-xs font-medium bg-otter-100 text-otter-800 px-2.5 py-1 rounded-full">
            {coupon.category || '精選'}
          </span>
        </div>

        {/* Content */}
        {/* 強制設定文字顏色，確保不會變白 */}
        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2 group-hover:text-accent-600 transition-colors">
          {coupon.title}
        </h3>
        
        <div className="text-sm text-gray-500 font-medium mb-2">
          {coupon.merchant_name}
        </div>

        <p className="text-sm text-gray-600 line-clamp-2 mb-4 h-10">
          {coupon.description || '點擊查看詳細優惠內容...'}
        </p>

        <div className="text-xs text-gray-400 flex items-center gap-1 mt-auto pt-2 border-t border-gray-50">
          <span>📅 有效期至: {formatDate(coupon.end_date)}</span>
        </div>
      </div>

      {/* Footer Action */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <button
          onClick={handleGetDeal}
          className={`w-full py-3 rounded-xl font-bold text-white transition-all active:scale-95 flex items-center justify-center gap-2 shadow-md
            ${isCopied ? 'bg-green-500' : 'bg-accent-500 hover:bg-accent-600'}
          `}
        >
          {isCopied ? '已複製！' : (coupon.code ? `獲取優惠碼: ${coupon.code}` : '立即購買')}
        </button>
      </div>
    </div>
  );
}
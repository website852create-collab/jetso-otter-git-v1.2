import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Jetso Otter 水獺優惠 | 最強網購折扣平台",
  description: "每日更新香港最新網購優惠碼、折扣券。水獺為你精打細算！",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-HK">
      <body className={`${inter.className} bg-otter-50 text-otter-900 min-h-screen`}>
        {/* Navbar */}
        <nav className="bg-white shadow-sm border-b border-otter-100 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🦦</span>
              <h1 className="text-xl font-bold text-otter-800 tracking-tight">Jetso Otter</h1>
            </div>
            <div className="text-sm text-otter-500">
              香港 No.1 智能優惠平台
            </div>
          </div>
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        <footer className="bg-otter-800 text-otter-100 py-8 mt-12">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p>© 2025 Jetso Otter. All rights reserved.</p>
            <p className="text-sm text-otter-400 mt-2">部分連結可能包含聯盟行銷代碼</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Allo — Inventory & Fulfillment',
  description: 'Multi-warehouse inventory reservation platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-stone-50">
        <header className="border-b border-stone-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 bg-stone-900 rounded-sm flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="1" width="5" height="5" fill="white" opacity="0.9"/>
                  <rect x="8" y="1" width="5" height="5" fill="white" opacity="0.6"/>
                  <rect x="1" y="8" width="5" height="5" fill="white" opacity="0.6"/>
                  <rect x="8" y="8" width="5" height="5" fill="white" opacity="0.3"/>
                </svg>
              </div>
              <span
                className="font-display text-lg font-semibold tracking-tight text-stone-900 group-hover:text-stone-600 transition-colors"
                style={{ fontFamily: 'Fraunces, serif' }}
              >
                allo
              </span>
            </a>
            <nav className="flex items-center gap-6">
              <a href="/" className="text-sm text-stone-500 hover:text-stone-900 transition-colors font-medium">
                Products
              </a>
              <span className="text-xs font-mono bg-stone-100 text-stone-500 px-2 py-1 rounded border border-stone-200">
                Inventory Platform
              </span>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          {children}
        </main>
        <footer className="border-t border-stone-200 mt-16 py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
            <p className="text-xs text-stone-400 font-mono">allo inventory platform v0.1</p>
            <p className="text-xs text-stone-400">Multi-warehouse fulfillment</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

import type {Metadata} from 'next';
import { Vazirmatn } from 'next/font/google';
import './globals.css'; // Global styles

const vazirmatn = Vazirmatn({
  subsets: ['arabic'],
  weight: ['100', '300', '400', '500', '700', '900'],
  variable: '--font-vazir',
});

export const metadata: Metadata = {
  title: 'رست سنتر | مدیریت تجهیزات رسانه‌ای و آفیش',
  description: 'سیستم هوشمند و جامع مدیریت تجهیزات رسانه‌ای، آفیش عوامل و فاکتوردهی رست سنتر',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="fa" dir="rtl" className={vazirmatn.variable}>
      <body className={`${vazirmatn.className} bg-[#0a0a0c] text-slate-100 antialiased`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

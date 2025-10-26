import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { StoreProvider } from '@/components/providers/store-provider';
import { AuthProvider } from '@/hooks/use-auth';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MindNote - 智能笔记应用',
  description: '智能记录、自动归类、关联分析的下一代笔记应用',
  keywords: ['智能笔记', 'AI分析', '知识管理', '关系图谱', '自动化'],
  authors: [{ name: 'MindNote Team' }],
  applicationName: 'MindNote',
  referrer: 'origin-when-cross-origin',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('http://localhost:3000'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'zh_CN',
    url: 'http://localhost:3000',
    title: 'MindNote - 智能笔记应用',
    description: '智能记录、自动归类、关联分析的下一代笔记应用',
    siteName: 'MindNote',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MindNote - 智能笔记应用',
    description: '智能记录、自动归类、关联分析的下一代笔记应用',
  },
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='zh-CN' suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute='data-theme'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange={false}
        >
          <StoreProvider>
            <AuthProvider>{children}</AuthProvider>
          </StoreProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

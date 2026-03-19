/**
 * 字体优化配置
 * 使用 Next.js 字体优化功能
 */

import { Inter, Noto_Sans_SC } from 'next/font/google';

// 英文字体 - Inter
export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
  fallback: ['system-ui', 'arial'],
  adjustFontFallback: true,
});

// 中文字体 - Noto Sans SC
export const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700'],
  display: 'swap',
  variable: '--font-noto-sans-sc',
  preload: true,
  fallback: ['system-ui', 'arial'],
  adjustFontFallback: true,
});

/**
 * 字体类名组合
 */
export const fontClassNames = `${inter.variable} ${notoSansSC.variable}`;

/**
 * 字体预加载链接
 */
export const fontPreloadLinks = [
  {
    rel: 'preconnect',
    href: 'https://fonts.googleapis.com',
  },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
];

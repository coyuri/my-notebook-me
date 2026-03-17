import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI解説ジェネレーター',
  description: 'URLを入力するだけで、ラジオ風の解説音声と詳細記事を自動生成します',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="min-h-screen bg-gray-50 antialiased">
        {children}
      </body>
    </html>
  );
}

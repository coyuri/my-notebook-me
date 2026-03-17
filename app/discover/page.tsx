'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { DiscoverItem } from '@/lib/discover';

// ── Category meta ─────────────────────────────────────────────────────────────

type CategoryKey = 'all' | 'paper' | 'github' | 'twitter' | 'ai';

const TABS: { key: CategoryKey; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'paper', label: '📄 論文' },
  { key: 'github', label: '⭐ GitHub' },
  { key: 'twitter', label: '🐦 X' },
  { key: 'ai', label: '🤖 AI' },
];

const BADGE_STYLES: Record<DiscoverItem['category'], string> = {
  paper: 'bg-blue-100 text-blue-700',
  github: 'bg-gray-100 text-gray-700',
  twitter: 'bg-sky-100 text-sky-700',
  ai: 'bg-purple-100 text-purple-700',
};

const BADGE_LABELS: Record<DiscoverItem['category'], string> = {
  paper: '論文',
  github: 'GitHub',
  twitter: 'X',
  ai: 'AI',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

// ── Card ──────────────────────────────────────────────────────────────────────

function ItemCard({ item }: { item: DiscoverItem }) {
  const generateUrl = `/?url=${encodeURIComponent(item.url)}`;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
      {/* Badge row */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${BADGE_STYLES[item.category]}`}
        >
          {BADGE_LABELS[item.category]}
        </span>
        {item.published_at && (
          <span className="text-xs text-gray-400">{formatDate(item.published_at)}</span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">
        {item.title}
      </h3>

      {/* Description */}
      {item.description && (
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">{item.description}</p>
      )}

      {/* Source + CTA */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <span className="text-xs text-gray-400 truncate max-w-[120px]">{item.source}</span>
        <Link
          href={generateUrl}
          className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 active:bg-brand-700 px-3 py-1.5 rounded-lg transition-colors"
        >
          このURLで解説生成 →
        </Link>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DiscoverPage() {
  const [items, setItems] = useState<DiscoverItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeTab, setActiveTab] = useState<CategoryKey>('all');

  async function loadItems() {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/discover');
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      setItems(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  const filtered =
    activeTab === 'all' ? items : items.filter((i) => i.category === activeTab);

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8 max-w-lg mx-auto">
      {/* Header */}
      <header className="w-full mb-6 text-center">
        <Link href="/" className="inline-block mb-4 text-xs text-gray-400 hover:text-gray-600">
          ← ホームへ戻る
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">今日のおすすめ</h1>
        <p className="mt-1 text-sm text-gray-500">URLをワンクリックで解説生成</p>
      </header>

      {/* Tabs */}
      <div className="w-full flex gap-2 overflow-x-auto pb-1 mb-4 scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors
              ${
                activeTab === tab.key
                  ? 'bg-brand-500 text-white border-brand-500'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="w-full space-y-3">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-100 h-40 animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="w-full text-center py-16 space-y-3">
          <p className="text-gray-500 text-sm">取得できませんでした</p>
          <button
            type="button"
            onClick={loadItems}
            className="text-sm font-semibold text-brand-500 hover:underline"
          >
            再試行
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="w-full text-center py-16">
          <p className="text-gray-400 text-sm">コンテンツがありません</p>
        </div>
      ) : (
        <div className="w-full space-y-3">
          {filtered.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Footer */}
      <footer className="mt-10 text-xs text-gray-400 text-center">
        <p>コンテンツは1時間ごとに更新されます</p>
      </footer>
    </main>
  );
}

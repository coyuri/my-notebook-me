'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import UrlInput from '@/components/UrlInput';
import CharacterSelect from '@/components/CharacterSelect';
import ProgressBar, { ProgressStep } from '@/components/ProgressBar';

function HomePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [url, setUrl] = useState('');

  // Pre-fill URL from ?url= query param (set by /discover page)
  useEffect(() => {
    const paramUrl = searchParams.get('url');
    if (paramUrl) {
      setUrl(paramUrl);
    }
  }, [searchParams]);
  const [hostSpeakerId, setHostSpeakerId] = useState(3);
  const [guestSpeakerId, setGuestSpeakerId] = useState(2);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressStatus, setProgressStatus] = useState<ProgressStep>('idle');
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState('');

  async function handleGenerate() {
    setError('');
    if (!url.trim()) {
      setError('URLを入力してください');
      return;
    }
    if (!url.startsWith('http')) {
      setError('有効なURLを入力してください（http:// または https:// で始まるURL）');
      return;
    }

    setIsGenerating(true);
    setProgressStatus('fetching');
    setProgressMessage('コンテンツ取得中...');

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, host_speaker_id: hostSpeakerId, guest_speaker_id: guestSpeakerId }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`APIエラー: ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const event = JSON.parse(trimmed) as {
              status: ProgressStep;
              message?: string;
              result_id?: string;
            };

            setProgressStatus(event.status);
            if (event.message) setProgressMessage(event.message);

            if (event.status === 'done' && event.result_id) {
              // Small delay so user can see the "done" state
              setTimeout(() => {
                router.push(`/result/${event.result_id}`);
              }, 800);
              return;
            }

            if (event.status === 'error') {
              setError(event.message ?? '不明なエラーが発生しました');
              setIsGenerating(false);
              return;
            }
          } catch {
            // Ignore non-JSON lines
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラーが発生しました';
      setError(message);
      setProgressStatus('error');
      setProgressMessage(message);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center px-4 py-8 max-w-lg mx-auto">
      {/* Header */}
      <header className="w-full mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-500 rounded-2xl mb-4 shadow-lg">
          <span className="text-2xl">🎙️</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">AI解説ジェネレーター</h1>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">
          URLを入力するだけで<br />
          ラジオ風の解説音声と詳細記事を自動生成
        </p>
        <Link
          href="/discover"
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors"
        >
          今日のおすすめを見る →
        </Link>
      </header>

      {/* Card */}
      <div className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        {/* URL Input */}
        <UrlInput
          value={url}
          onChange={setUrl}
          disabled={isGenerating}
        />

        {/* Character Settings */}
        <CharacterSelect
          hostSpeakerId={hostSpeakerId}
          guestSpeakerId={guestSpeakerId}
          onHostChange={setHostSpeakerId}
          onGuestChange={setGuestSpeakerId}
          disabled={isGenerating}
        />

        {/* Error message */}
        {error && !isGenerating && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Progress */}
        {isGenerating && (
          <div className="pt-2">
            <ProgressBar status={progressStatus} message={progressMessage} />
          </div>
        )}

        {/* Generate button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || !url.trim()}
          className="w-full py-4 px-6 bg-brand-500 hover:bg-brand-600 active:bg-brand-700
                     text-white font-semibold text-base rounded-xl
                     transition-colors shadow-md
                     disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none
                     focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              生成中...
            </span>
          ) : (
            '生成スタート'
          )}
        </button>
      </div>

      {/* Footer */}
      <footer className="mt-8 text-xs text-gray-400 text-center space-y-1">
        <p>Powered by Claude API · VOICEVOX · Supabase</p>
        <p>生成には1〜3分程度かかります</p>
      </footer>
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <HomePageInner />
    </Suspense>
  );
}

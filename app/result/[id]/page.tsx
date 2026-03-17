import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase, Generation } from '@/lib/supabase';
import { getPublicAudioUrl } from '@/lib/voicevox';

interface PageProps {
  params: { id: string };
}

async function getGeneration(id: string): Promise<Generation | null> {
  const { data, error } = await supabase
    .from('generations')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;
  return data as Generation;
}

function CategoryBadge({ category }: { category: string | null }) {
  const map: Record<string, { label: string; className: string }> = {
    github: { label: 'GitHub', className: 'bg-gray-800 text-white' },
    paper:  { label: '論文',   className: 'bg-blue-600 text-white' },
    tweet:  { label: 'X Post', className: 'bg-sky-500 text-white' },
    web:    { label: 'Web',    className: 'bg-green-600 text-white' },
  };
  const config = category ? map[category] : null;
  if (!config) return null;
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
}

function ScriptDisplay({ script }: { script: string }) {
  const lines = script.split('\n').filter((l) => l.trim());

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const hostMatch = line.match(/^ホスト：「(.+)」/);
        const guestMatch = line.match(/^ゲスト：「(.+)」/);

        if (hostMatch) {
          return (
            <div key={i} className="script-line-host">
              <span className="text-xs font-bold text-blue-600 block mb-1">ホスト</span>
              <p className="text-sm text-gray-800">「{hostMatch[1]}」</p>
            </div>
          );
        }
        if (guestMatch) {
          return (
            <div key={i} className="script-line-guest">
              <span className="text-xs font-bold text-purple-600 block mb-1">ゲスト</span>
              <p className="text-sm text-gray-800">「{guestMatch[1]}」</p>
            </div>
          );
        }
        // Non-dialogue lines (stage directions etc.)
        return (
          <p key={i} className="text-sm text-gray-500 italic px-2">
            {line}
          </p>
        );
      })}
    </div>
  );
}

function TextContent({ content }: { content: string }) {
  // Convert markdown-style headings to styled elements
  const lines = content.split('\n');
  return (
    <div className="prose-content text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith('# ')) {
          return <h1 key={i}>{line.slice(2)}</h1>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={i}>{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={i}>{line.slice(4)}</h3>;
        }
        if (line.startsWith('- ') || line.startsWith('* ')) {
          return <li key={i} className="list-disc ml-4">{line.slice(2)}</li>;
        }
        if (line.trim() === '') {
          return <br key={i} />;
        }
        return <p key={i}>{line}</p>;
      })}
    </div>
  );
}

export default async function ResultPage({ params }: PageProps) {
  const generation = await getGeneration(params.id);

  if (!generation) {
    notFound();
  }

  const audioUrl = generation.audio_path
    ? getPublicAudioUrl(generation.audio_path)
    : null;

  const createdAt = new Date(generation.created_at).toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <main className="min-h-screen bg-gray-50 pb-12">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-800 font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          戻る
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {generation.title ?? '生成結果'}
          </p>
        </div>
        {generation.category && <CategoryBadge category={generation.category} />}
      </div>

      <div className="max-w-2xl mx-auto px-4 pt-6 space-y-6">
        {/* Meta */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
            <span>生成日時: {createdAt}</span>
            <span className="text-gray-300">|</span>
            <span className="truncate max-w-xs">
              <a
                href={generation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-600 hover:underline"
              >
                {generation.url}
              </a>
            </span>
          </div>
          {generation.title && (
            <h1 className="text-lg font-bold text-gray-900">{generation.title}</h1>
          )}
        </div>

        {/* Audio player */}
        {audioUrl ? (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <span>🎙️</span> ラジオ音声
            </h2>
            <audio
              controls
              className="w-full"
              src={audioUrl}
            >
              お使いのブラウザは音声再生に対応していません
            </audio>
            <p className="mt-2 text-xs text-gray-400">
              ※ Phase 1: 台本の最初のセグメントのみ。全セグメント結合は Phase 2 で対応予定。
            </p>
            <a
              href={audioUrl}
              download
              className="mt-3 inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              音声ダウンロード
            </a>
          </section>
        ) : (
          <section className="bg-yellow-50 rounded-2xl border border-yellow-200 p-5">
            <p className="text-sm text-yellow-800 flex items-center gap-2">
              <span>⚠️</span>
              音声の生成ができませんでした（VOICEVOX API キーを確認してください）
            </p>
          </section>
        )}

        {/* Detailed text explanation */}
        {generation.text_content && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span>📖</span> 詳細解説記事
            </h2>
            <TextContent content={generation.text_content} />
          </section>
        )}

        {/* Radio script */}
        {generation.script && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span>🎭</span> ラジオ台本
            </h2>
            <ScriptDisplay script={generation.script} />
          </section>
        )}

        {/* Phase 2 placeholders */}
        <section className="bg-gray-50 rounded-2xl border border-dashed border-gray-300 p-5">
          <h2 className="text-sm font-bold text-gray-500 mb-3 flex items-center gap-2">
            <span>🚧</span> Phase 2 予定機能
          </h2>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 opacity-60">
              <span className="text-lg">🎬</span>
              <div>
                <p className="text-sm font-medium text-gray-600">スライド動画生成</p>
                <p className="text-xs text-gray-400">台本に合わせたビジュアルスライドを自動生成</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 opacity-60">
              <span className="text-lg">🎵</span>
              <div>
                <p className="text-sm font-medium text-gray-600">音声結合 (ffmpeg)</p>
                <p className="text-xs text-gray-400">全台詞を1つの音声ファイルに結合</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

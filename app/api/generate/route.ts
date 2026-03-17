/**
 * POST /api/generate
 *
 * Streaming response (NDJSON) — one JSON object per line:
 * { "status": "fetching",          "message": "コンテンツ取得中..." }
 * { "status": "analyzing",         "message": "AI解析中..." }
 * { "status": "generating_text",   "message": "解説テキスト生成中..." }
 * { "status": "generating_voice",  "message": "音声生成中..." }
 * { "status": "done",              "result_id": "<uuid>" }
 *
 * On error:
 * { "status": "error", "message": "<description>" }
 */

import { NextRequest } from 'next/server';
import { fetchContent } from '@/lib/fetch-content';
import { analyzeContent, generateScript, generateDetailedText } from '@/lib/claude';
import { generateAndUploadAudio } from '@/lib/voicevox';
import { createAdminClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes — audio generation can be slow

type ProgressStatus =
  | 'fetching'
  | 'analyzing'
  | 'generating_text'
  | 'generating_voice'
  | 'done'
  | 'error';

interface ProgressEvent {
  status: ProgressStatus;
  message?: string;
  result_id?: string;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { url, host_speaker_id = 3, guest_speaker_id = 2 } = body as {
    url?: string;
    host_speaker_id?: number;
    guest_speaker_id?: number;
  };

  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return new Response(
      JSON.stringify({ status: 'error', message: '有効なURLを入力してください' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: ProgressEvent) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + '\n'));
      }

      const supabase = createAdminClient();

      // Create initial DB record
      const { data: record, error: insertError } = await supabase
        .from('generations')
        .insert({
          url,
          status: 'pending',
          host_speaker_id,
          guest_speaker_id,
        })
        .select()
        .single();

      if (insertError || !record) {
        send({ status: 'error', message: `DBへの保存に失敗しました: ${insertError?.message}` });
        controller.close();
        return;
      }

      const generationId: string = record.id;

      try {
        // Step 1 — Fetch content
        send({ status: 'fetching', message: 'コンテンツ取得中...' });
        const fetched = await fetchContent(url);

        // Step 2 — Analyze with Claude
        send({ status: 'analyzing', message: 'AI解析中...' });
        const analysis = await analyzeContent(fetched.text);

        // Update DB with analysis results
        await supabase
          .from('generations')
          .update({
            title: analysis.title,
            category: analysis.category,
            status: 'analyzing',
          })
          .eq('id', generationId);

        // Step 3 — Generate script + detailed text
        send({ status: 'generating_text', message: '解説テキスト生成中...' });
        const [script, textContent] = await Promise.all([
          generateScript(analysis),
          generateDetailedText(analysis, fetched.text, url),
        ]);

        // Save generated texts
        await supabase
          .from('generations')
          .update({
            script,
            text_content: textContent,
            status: 'generating_voice',
          })
          .eq('id', generationId);

        // Step 4 — Generate voice
        send({ status: 'generating_voice', message: '音声生成中...' });
        let audioPath: string | null = null;
        try {
          audioPath = await generateAndUploadAudio(
            generationId,
            script,
            host_speaker_id,
            guest_speaker_id
          );
        } catch (voiceErr) {
          console.error('音声生成エラー (non-fatal):', voiceErr);
          // Voice generation failure is non-fatal — continue to done
        }

        // Mark as done
        await supabase
          .from('generations')
          .update({
            audio_path: audioPath,
            status: 'done',
          })
          .eq('id', generationId);

        send({ status: 'done', result_id: generationId });
      } catch (err) {
        const message = err instanceof Error ? err.message : '不明なエラーが発生しました';
        console.error('生成エラー:', err);

        // Update DB with error status
        await supabase
          .from('generations')
          .update({ status: 'error' })
          .eq('id', generationId);

        send({ status: 'error', message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-cache',
      'Transfer-Encoding': 'chunked',
    },
  });
}

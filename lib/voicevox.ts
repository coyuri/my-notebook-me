/**
 * VOICEVOX audio generation
 * API endpoint: https://deprecatedapis.tts.quest/v2/voicevox/audio/
 *
 * For Phase 1:
 * - Parse script lines "ホスト：「...」" / "ゲスト：「...」"
 * - Generate audio for each line individually
 * - Upload each to Supabase storage
 * - Return path of first segment as placeholder
 *   (full merge requires ffmpeg — Phase 2)
 */

import { createAdminClient } from './supabase';

const VOICEVOX_API_BASE = 'https://deprecatedapis.tts.quest/v2/voicevox/audio/';

export type ScriptLine = {
  speaker: 'host' | 'guest';
  text: string;
};

export type CharacterOption = {
  name: string;
  speakerId: number;
};

export const CHARACTER_OPTIONS: CharacterOption[] = [
  { name: 'ずんだもん', speakerId: 3 },
  { name: '四国めたん', speakerId: 2 },
  { name: '春日部つむぎ', speakerId: 8 },
  { name: '波音リツ', speakerId: 9 },
  { name: '雨晴はう', speakerId: 10 },
  { name: '玄野武宏', speakerId: 11 },
  { name: '白上虎太郎', speakerId: 12 },
  { name: '九州そら', speakerId: 16 },
];

export function parseScriptLines(script: string): ScriptLine[] {
  const lines: ScriptLine[] = [];
  const lineRegex = /^(ホスト|ゲスト)：「(.+?)」/gm;
  let match: RegExpExecArray | null;

  while ((match = lineRegex.exec(script)) !== null) {
    const [, role, text] = match;
    lines.push({
      speaker: role === 'ホスト' ? 'host' : 'guest',
      text: text.trim(),
    });
  }

  return lines;
}

async function generateAudioForLine(
  text: string,
  speakerId: number
): Promise<ArrayBuffer> {
  const apiKey = process.env.VOICEVOX_API_KEY;
  if (!apiKey) throw new Error('VOICEVOX_API_KEY が設定されていません');

  const url = `${VOICEVOX_API_BASE}?speaker=${speakerId}&text=${encodeURIComponent(text)}&key=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`VOICEVOX APIエラー: ${res.status} ${res.statusText}`);
  }

  return res.arrayBuffer();
}

export async function generateAndUploadAudio(
  generationId: string,
  script: string,
  hostSpeakerId: number,
  guestSpeakerId: number
): Promise<string> {
  const lines = parseScriptLines(script);

  if (lines.length === 0) {
    throw new Error('台本から台詞を解析できませんでした');
  }

  const supabase = createAdminClient();
  const uploadedPaths: string[] = [];

  // Generate audio for each line and upload to Supabase storage
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const speakerId = line.speaker === 'host' ? hostSpeakerId : guestSpeakerId;

    // Skip empty lines
    if (!line.text.trim()) continue;

    try {
      const audioBuffer = await generateAudioForLine(line.text, speakerId);
      const audioBytes = new Uint8Array(audioBuffer);
      const fileName = `${generationId}/line_${String(i).padStart(3, '0')}_${line.speaker}.wav`;

      const { error } = await supabase.storage
        .from('audio')
        .upload(fileName, audioBytes, {
          contentType: 'audio/wav',
          upsert: true,
        });

      if (error) {
        console.error(`音声アップロードエラー (line ${i}):`, error.message);
        continue;
      }

      uploadedPaths.push(fileName);
    } catch (err) {
      console.error(`音声生成エラー (line ${i}):`, err);
      // Continue with remaining lines rather than failing entirely
    }
  }

  if (uploadedPaths.length === 0) {
    throw new Error('音声ファイルを1つもアップロードできませんでした');
  }

  // Phase 1: Return the first segment path as the primary audio path.
  // Phase 2 will use ffmpeg to concatenate all segments into a single file.
  return uploadedPaths[0];
}

export function getPublicAudioUrl(path: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${supabaseUrl}/storage/v1/object/public/audio/${path}`;
}

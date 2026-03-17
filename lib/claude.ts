/**
 * Claude API calls via @anthropic-ai/sdk
 * Model: claude-sonnet-4-20250514
 *
 * Step 1: Content analysis → JSON
 * Step 2: Radio script generation
 * Step 3: Detailed explanation article
 */

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-20250514';

export type ContentAnalysis = {
  title: string;
  category: 'github' | 'paper' | 'tweet' | 'web';
  core_insight: string;
  why_matters: string;
  surprising_angle: string;
  key_points: string[];
  target_audience: string;
};

// Step 1 - Content understanding
export async function analyzeContent(rawText: string): Promise<ContentAnalysis> {
  const prompt = `以下のコンテンツを分析して、JSON形式で返してください。

コンテンツ:
${rawText}

返すJSON:
{
  "title": "タイトル（日本語）",
  "category": "github | paper | tweet | web",
  "core_insight": "一番驚くべき発見や事実を1文で",
  "why_matters": "なぜ今これが重要かを2〜3文で",
  "surprising_angle": "技術に詳しくない人が『え、それってつまり○○ってこと？』と言いたくなる切り口",
  "key_points": ["重要ポイント1", "重要ポイント2", "重要ポイント3"],
  "target_audience": "誰に一番刺さるか"
}

JSONのみ返してください。`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const responseText =
    message.content[0].type === 'text' ? message.content[0].text : '';

  // Extract JSON from response (handle potential markdown code blocks)
  const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/) ||
    responseText.match(/(\{[\s\S]*\})/);

  const jsonStr = jsonMatch ? jsonMatch[1] : responseText;

  try {
    return JSON.parse(jsonStr) as ContentAnalysis;
  } catch {
    throw new Error(`Claude からのJSON解析に失敗しました: ${responseText.slice(0, 200)}`);
  }
}

// Step 2 - Radio script generation
export async function generateScript(analysis: ContentAnalysis): Promise<string> {
  const prompt = `以下の情報をもとに、ラジオ風の掛け合い台本を日本語で書いてください。

情報:
${JSON.stringify(analysis, null, 2)}

ルール:
- ホスト（驚き・質問担当）とゲスト（解説担当）の2人構成
- 冒頭でリスナーが「え、なにそれ？」と思う一言から始める
- 専門用語はホストが「それって要するに...？」と聞いて噛み砕く
- 全体で8〜12分相当（約2000〜3000文字）
- 最後はリスナーへのアクションを促して締める

出力形式:
ホスト：「...」
ゲスト：「...」
ホスト：「...」
...（続く）`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  return message.content[0].type === 'text' ? message.content[0].text : '';
}

// Step 3 - Detailed explanation article
export async function generateDetailedText(
  analysis: ContentAnalysis,
  rawContent: string,
  sourceUrl: string
): Promise<string> {
  const prompt = `以下の情報をもとに、電車の中で読める詳細解説記事を日本語で書いてください。

情報:
${JSON.stringify(analysis, null, 2)}

元コンテンツ（抜粋）:
${rawContent.slice(0, 3000)}

ルール:
- 読了時間：5〜8分（約2000〜2500文字）
- 冒頭に「3行まとめ」を入れる
- 見出しで区切って読みやすくする
- 専門用語には括弧で補足説明
- 最後に「さらに詳しく知るには」として元URLを記載
- NotebookLMのように「なぜ重要か」「何が新しいか」を前面に出す

元URL: ${sourceUrl}`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }],
  });

  return message.content[0].type === 'text' ? message.content[0].text : '';
}

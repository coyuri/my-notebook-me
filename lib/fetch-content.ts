/**
 * URL detection & content fetching
 *
 * - GitHub: fetch README.md + repo info via GitHub API
 * - X/Twitter: convert to fxtwitter.com for public access
 * - arXiv: fetch abstract page
 * - Other: plain web fetch with text extraction
 */

export type FetchedContent = {
  text: string;
  sourceUrl: string;
  detectedType: 'github' | 'paper' | 'tweet' | 'web';
};

function detectUrlType(url: string): 'github' | 'paper' | 'tweet' | 'web' {
  if (url.includes('github.com')) return 'github';
  if (url.includes('arxiv.org')) return 'paper';
  if (url.includes('x.com') || url.includes('twitter.com')) return 'tweet';
  return 'web';
}

async function fetchGitHub(url: string): Promise<string> {
  // Extract owner/repo from URL like https://github.com/owner/repo
  const match = url.match(/github\.com\/([^/]+)\/([^/?#]+)/);
  if (!match) throw new Error('GitHubのURLからリポジトリ情報を取得できませんでした');

  const [, owner, repo] = match;
  const apiBase = `https://api.github.com/repos/${owner}/${repo}`;

  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'ai-content-generator/1.0',
  };

  // Fetch repo info
  const repoRes = await fetch(apiBase, { headers });
  if (!repoRes.ok) throw new Error(`GitHub APIエラー: ${repoRes.status}`);
  const repoData = await repoRes.json();

  // Fetch README
  let readmeText = '';
  try {
    const readmeRes = await fetch(`${apiBase}/readme`, { headers });
    if (readmeRes.ok) {
      const readmeData = await readmeRes.json();
      readmeText = Buffer.from(readmeData.content, 'base64').toString('utf-8');
      // Trim very long READMEs
      if (readmeText.length > 8000) {
        readmeText = readmeText.slice(0, 8000) + '\n\n[README続き省略]';
      }
    }
  } catch {
    readmeText = 'READMEが見つかりませんでした';
  }

  return `
# GitHubリポジトリ情報

## リポジトリ名
${repoData.full_name}

## 説明
${repoData.description || '説明なし'}

## 統計
- Stars: ${repoData.stargazers_count}
- Forks: ${repoData.forks_count}
- Watch: ${repoData.watchers_count}
- 主要言語: ${repoData.language || '不明'}
- 最終更新: ${repoData.updated_at}

## トピック
${(repoData.topics || []).join(', ') || 'なし'}

## README
${readmeText}
`.trim();
}

async function fetchArxiv(url: string): Promise<string> {
  // Extract arxiv ID from URL like https://arxiv.org/abs/2301.12345
  const match = url.match(/arxiv\.org\/(?:abs|pdf)\/([0-9.]+)/);
  if (!match) throw new Error('arXivのURLからIDを取得できませんでした');

  const arxivId = match[1];
  const apiUrl = `https://export.arxiv.org/api/query?id_list=${arxivId}`;

  const res = await fetch(apiUrl);
  if (!res.ok) throw new Error(`arXiv APIエラー: ${res.status}`);

  const xmlText = await res.text();

  // Parse relevant fields from Atom XML
  const title = xmlText.match(/<title>([^<]+)<\/title>/)?.[1]?.trim() ?? '不明';
  const summary = xmlText.match(/<summary>([^<]+)<\/summary>/s)?.[1]?.trim() ?? '要約なし';
  const authors = [...xmlText.matchAll(/<name>([^<]+)<\/name>/g)]
    .map((m) => m[1])
    .join(', ');
  const published = xmlText.match(/<published>([^<]+)<\/published>/)?.[1]?.trim() ?? '不明';

  return `
# arXiv論文情報

## タイトル
${title}

## 著者
${authors}

## 発表日
${published}

## 要約 (Abstract)
${summary}

## 元URL
${url}
`.trim();
}

async function fetchTweet(url: string): Promise<string> {
  // Convert x.com/twitter.com to fxtwitter.com for better scraping support
  const fxUrl = url
    .replace('https://x.com', 'https://fxtwitter.com')
    .replace('https://twitter.com', 'https://fxtwitter.com');

  const res = await fetch(fxUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    },
  });

  if (!res.ok) throw new Error(`ツイート取得エラー: ${res.status}`);

  const html = await res.text();

  // Extract og:description for tweet text
  const description =
    html.match(/<meta property="og:description" content="([^"]+)"/)?.[1] ?? '';
  const tweetText = description.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'");

  const authorName =
    html.match(/<meta property="og:title" content="([^"]+)"/)?.[1] ?? '不明';

  return `
# Xポスト (旧Twitter)

## 投稿者
${authorName}

## 内容
${tweetText || 'テキストを取得できませんでした'}

## 元URL
${url}
`.trim();
}

async function fetchWeb(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ja,en;q=0.5',
    },
  });

  if (!res.ok) throw new Error(`ページ取得エラー: ${res.status}`);

  const html = await res.text();

  // Basic HTML text extraction
  let text = html
    // Remove scripts
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    // Remove styles
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    // Remove HTML comments
    .replace(/<!--[\s\S]*?-->/g, '')
    // Replace block elements with newlines
    .replace(/<\/?(p|div|h[1-6]|li|br|tr|section|article|header|footer)[^>]*>/gi, '\n')
    // Remove remaining tags
    .replace(/<[^>]+>/g, ' ')
    // Decode common HTML entities
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    // Collapse whitespace
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Try to extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const pageTitle = titleMatch ? titleMatch[1].trim() : 'タイトル不明';

  // Extract og:description as additional context
  const ogDesc =
    html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1] ?? '';

  // Trim text to avoid excessive tokens
  if (text.length > 8000) {
    text = text.slice(0, 8000) + '\n\n[本文続き省略]';
  }

  return `
# Webページ情報

## タイトル
${pageTitle}

## OGP説明
${ogDesc || '説明なし'}

## 本文
${text}

## 元URL
${url}
`.trim();
}

export async function fetchContent(url: string): Promise<FetchedContent> {
  const detectedType = detectUrlType(url);

  let text: string;

  switch (detectedType) {
    case 'github':
      text = await fetchGitHub(url);
      break;
    case 'paper':
      text = await fetchArxiv(url);
      break;
    case 'tweet':
      text = await fetchTweet(url);
      break;
    default:
      text = await fetchWeb(url);
  }

  return {
    text,
    sourceUrl: url,
    detectedType,
  };
}

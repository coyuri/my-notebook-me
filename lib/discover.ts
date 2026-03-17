/**
 * Discover feed — fetches curated content from multiple sources.
 */

export type DiscoverItem = {
  id: string;
  category: 'paper' | 'github' | 'twitter' | 'ai';
  title: string;
  description: string;
  url: string;
  source: string;
  published_at?: string;
};

// ── arXiv ────────────────────────────────────────────────────────────────────

async function fetchArxivItems(): Promise<DiscoverItem[]> {
  try {
    const res = await fetch(
      'https://export.arxiv.org/api/query?search_query=cat:cs.AI+OR+cat:cs.LG&sortBy=submittedDate&sortOrder=descending&max_results=5',
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return [];

    const xml = await res.text();

    // Split on <entry> boundaries
    const entryMatches = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];

    return entryMatches.map((m, i) => {
      const entry = m[1];

      const rawTitle = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? 'タイトル不明';
      const title = rawTitle.replace(/\s+/g, ' ').trim();

      const rawSummary = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] ?? '';
      const description = rawSummary.replace(/\s+/g, ' ').trim().slice(0, 200);

      // <id> contains something like http://arxiv.org/abs/2401.12345v1
      const rawId = entry.match(/<id>([\s\S]*?)<\/id>/)?.[1]?.trim() ?? '';
      const url = rawId.replace('http://', 'https://');

      const published_at = entry.match(/<published>([\s\S]*?)<\/published>/)?.[1]?.trim();

      return {
        id: `arxiv-${i}-${rawId.split('/').pop() ?? i}`,
        category: 'paper' as const,
        title,
        description,
        url,
        source: 'arXiv',
        published_at,
      };
    });
  } catch {
    return [];
  }
}

// ── GitHub Trending ───────────────────────────────────────────────────────────

async function fetchGitHubTrending(): Promise<DiscoverItem[]> {
  try {
    const res = await fetch('https://github.com/trending', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];

    const html = await res.text();

    // Each trending repo block is inside an <article> tag
    const articleMatches = [...html.matchAll(/<article[\s\S]*?<\/article>/g)];

    const items: DiscoverItem[] = [];

    for (let i = 0; i < Math.min(articleMatches.length, 5); i++) {
      const block = articleMatches[i][0];

      // href="/owner/repo" — pick the first one in the block
      const hrefMatch = block.match(/href="\/([^/"]+\/[^/"]+)"/);
      if (!hrefMatch) continue;

      const repoPath = hrefMatch[1];
      const url = `https://github.com/${repoPath}`;
      const title = repoPath.replace('/', ' / ');

      // Description is in a <p> element inside the article
      const descMatch = block.match(/<p[^>]*>([\s\S]*?)<\/p>/);
      const description = descMatch
        ? descMatch[1]
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim()
        : '';

      items.push({
        id: `github-${i}-${repoPath.replace('/', '-')}`,
        category: 'github' as const,
        title,
        description,
        url,
        source: 'GitHub Trending',
      });
    }

    return items;
  } catch {
    return [];
  }
}

// ── X / Nitter ────────────────────────────────────────────────────────────────

async function fetchTwitterItems(): Promise<DiscoverItem[]> {
  try {
    const query = encodeURIComponent('AIビジネス OR Claude OR 生成AI');
    const res = await fetch(
      `https://nitter.privacyredirect.com/search/rss?q=${query}&f=tweets`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return [];

    const xml = await res.text();
    const itemMatches = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

    return itemMatches.slice(0, 5).map((m, i) => {
      const item = m[1];

      const rawTitle = item.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '';
      const title = rawTitle
        .replace(/<!\[CDATA\[/, '')
        .replace(/\]\]>/, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120);

      const rawLink = item.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? '';
      // Nitter links — convert back to x.com
      const url = rawLink
        .replace('nitter.privacyredirect.com', 'x.com')
        .replace(/^http:/, 'https:');

      const rawDesc = item.match(/<description>([\s\S]*?)<\/description>/)?.[1] ?? '';
      const description = rawDesc
        .replace(/<!\[CDATA\[/, '')
        .replace(/\]\]>/, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 200);

      const published_at = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim();

      return {
        id: `twitter-${i}-${encodeURIComponent(url).slice(-12)}`,
        category: 'twitter' as const,
        title: title || description.slice(0, 80),
        description,
        url,
        source: 'X (Twitter)',
        published_at,
      };
    });
  } catch {
    return [];
  }
}

// ── Anthropic / Claude Code Releases ─────────────────────────────────────────

async function fetchAIItems(): Promise<DiscoverItem[]> {
  try {
    const res = await fetch(
      'https://api.github.com/repos/anthropics/claude-code/releases?per_page=5',
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'ai-content-generator/1.0',
        },
        next: { revalidate: 3600 },
      },
    );
    if (!res.ok) return [];

    const releases = await res.json() as Array<{
      id: number;
      name: string;
      body: string;
      html_url: string;
      published_at: string;
    }>;

    return releases.map((r, i) => ({
      id: `ai-${i}-${r.id}`,
      category: 'ai' as const,
      title: r.name || 'Claude Code リリース',
      description: (r.body ?? '').slice(0, 100),
      url: r.html_url,
      source: 'Anthropic / Claude Code',
      published_at: r.published_at,
    }));
  } catch {
    return [];
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function fetchDiscoverItems(): Promise<DiscoverItem[]> {
  const [papers, github, twitter, ai] = await Promise.all([
    fetchArxivItems(),
    fetchGitHubTrending(),
    fetchTwitterItems(),
    fetchAIItems(),
  ]);

  const all = [...papers, ...github, ...twitter, ...ai];

  // Sort by published_at descending; items without a date go to the end
  all.sort((a, b) => {
    if (!a.published_at && !b.published_at) return 0;
    if (!a.published_at) return 1;
    if (!b.published_at) return -1;
    return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
  });

  return all;
}

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Fetch the HTML content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KonsumBacklog/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();

    // Parse metadata using regex (simple approach)
    const metadata = {
      title: extractMetaTag(html, 'title') || extractMetaTag(html, 'og:title') || extractMetaTag(html, 'twitter:title'),
      description: extractMetaTag(html, 'description') || extractMetaTag(html, 'og:description') || extractMetaTag(html, 'twitter:description'),
      image: extractMetaTag(html, 'og:image') || extractMetaTag(html, 'twitter:image'),
      siteName: extractMetaTag(html, 'og:site_name'),
      favicon: extractFavicon(html, url),
    };

    return NextResponse.json({ metadata });
  } catch (error) {
    console.error('Error fetching URL metadata:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metadata' },
      { status: 500 }
    );
  }
}

function extractMetaTag(html: string, property: string): string | null {
  let pattern: RegExp;
  
  if (property === 'title') {
    pattern = /<title[^>]*>([^<]+)<\/title>/i;
  } else {
    pattern = new RegExp(`<meta[^>]*(?:name|property)=["']${property}["'][^>]*content=["']([^"']+)["'][^>]*>`, 'i');
  }
  
  const match = html.match(pattern);
  return match ? match[1].trim() : null;
}

function extractFavicon(html: string, baseUrl: string): string | null {
  // Try to find favicon in various formats
  const patterns = [
    /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["'][^>]*>/i,
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["'][^>]*>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const faviconUrl = match[1];
      // Convert relative URLs to absolute
      if (faviconUrl.startsWith('/')) {
        const url = new URL(baseUrl);
        return `${url.protocol}//${url.host}${faviconUrl}`;
      } else if (faviconUrl.startsWith('http')) {
        return faviconUrl;
      } else {
        const url = new URL(baseUrl);
        return `${url.protocol}//${url.host}/${faviconUrl}`;
      }
    }
  }

  // Fallback to default favicon location
  try {
    const url = new URL(baseUrl);
    return `${url.protocol}//${url.host}/favicon.ico`;
  } catch {
    return null;
  }
} 
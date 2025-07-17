import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Validate URL format
    let validatedUrl: URL;
    try {
      validatedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    // Only allow HTTP/HTTPS URLs
    if (!['http:', 'https:'].includes(validatedUrl.protocol)) {
      return NextResponse.json({ error: 'Only HTTP/HTTPS URLs are supported' }, { status: 400 });
    }

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      // Fetch the HTML content with timeout
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; KonsumBacklog/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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

      // If no title found, use domain as fallback
      if (!metadata.title) {
        metadata.title = validatedUrl.hostname.replace('www.', '');
      }

      return NextResponse.json({ metadata });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // Return fallback metadata instead of error
      const fallbackMetadata = {
        title: validatedUrl.hostname.replace('www.', ''),
        description: `Link to ${validatedUrl.hostname}`,
        image: null,
        siteName: validatedUrl.hostname.replace('www.', ''),
        favicon: `${validatedUrl.protocol}//${validatedUrl.host}/favicon.ico`,
      };

      console.warn(`Failed to fetch metadata for ${url}:`, fetchError);
      return NextResponse.json({ metadata: fallbackMetadata });
    }
  } catch (error) {
    console.error('Error in URL metadata API:', error);
    
    // Return fallback metadata for any other errors
    try {
      const body = await request.json();
      const url = new URL(body.url || '');
      const fallbackMetadata = {
        title: url.hostname.replace('www.', ''),
        description: `Link to ${url.hostname}`,
        image: null,
        siteName: url.hostname.replace('www.', ''),
        favicon: `${url.protocol}//${url.host}/favicon.ico`,
      };
      return NextResponse.json({ metadata: fallbackMetadata });
    } catch {
      return NextResponse.json(
        { error: 'Failed to process URL' },
        { status: 500 }
      );
    }
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
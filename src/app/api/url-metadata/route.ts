import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Fetch the webpage content
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();

    // Extract metadata using regex
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descriptionMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
    const ogDescriptionMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
    const ogImageMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
    const faviconMatch = html.match(/<link[^>]*rel=["'](?:icon|shortcut icon)["'][^>]*href=["']([^"']+)["']/i);

    // Extract domain for favicon fallback
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    const metadata = {
      title: ogTitleMatch?.[1] || titleMatch?.[1] || domain,
      description: ogDescriptionMatch?.[1] || descriptionMatch?.[1] || 'No description available',
      image: ogImageMatch?.[1] || null,
      favicon: faviconMatch?.[1] || `https://${domain}/favicon.ico`,
      domain: domain
    };

    return NextResponse.json(metadata);
  } catch (error) {
    console.error('Error fetching URL metadata:', error);
    
    // Return fallback metadata
    try {
      const { searchParams } = new URL(request.url);
      const urlParam = searchParams.get('url');
      if (urlParam) {
        const urlObj = new URL(urlParam);
        const domain = urlObj.hostname;
        
        return NextResponse.json({
          title: domain,
          description: 'Unable to fetch page metadata',
          image: null,
          favicon: `https://${domain}/favicon.ico`,
          domain: domain
        });
      }
    } catch {
      // Fallback if URL parsing fails
    }
    
    return NextResponse.json({
      title: 'Unknown',
      description: 'Unable to fetch page metadata',
      image: null,
      favicon: null,
      domain: 'unknown'
    });
  }
} 
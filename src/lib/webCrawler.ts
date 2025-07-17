import { JSDOM } from 'jsdom';

export interface WebPageContent {
  title: string;
  description: string;
  content: string;
  url: string;
}

export async function crawlWebPage(url: string): Promise<WebPageContent | null> {
  try {
    // Add protocol if missing
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Extract title
    const title = document.querySelector('title')?.textContent?.trim() || 
                  document.querySelector('h1')?.textContent?.trim() || 
                  'No title found';

    // Extract description
    const description = document.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() ||
                       document.querySelector('meta[property="og:description"]')?.getAttribute('content')?.trim() ||
                       'No description available';

    // Extract main content
    const mainContent = document.querySelector('main') || 
                       document.querySelector('article') || 
                       document.querySelector('.content') || 
                       document.querySelector('#content') || 
                       document.body;

    // Get text content, removing scripts and styles
    const scripts = mainContent.querySelectorAll('script, style, nav, header, footer, aside');
    scripts.forEach(el => el.remove());

    const content = mainContent.textContent?.trim() || 'No content available';

    return {
      title,
      description,
      content: content.substring(0, 2000), // Limit content length
      url
    };
  } catch (error) {
    console.error(`Error crawling ${url}:`, error);
    return null;
  }
} 
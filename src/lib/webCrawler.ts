import { JSDOM } from 'jsdom';

export interface WebPageContent {
  title: string;
  description: string;
  content: string;
  url: string;
  error?: string;
}

export class WebCrawler {
  static async extractContent(url: string): Promise<WebPageContent> {
    try {
      console.log(`Crawling URL: ${url}`);
      
      // Fetch the webpage
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const html = await response.text();
      
      // Parse HTML
      const dom = new JSDOM(html);
      const document = dom.window.document;

      // Extract title
      const title = document.querySelector('title')?.textContent?.trim() || 
                   document.querySelector('h1')?.textContent?.trim() || 
                   'No title found';

      // Extract description
      const description = document.querySelector('meta[name="description"]')?.getAttribute('content') ||
                         document.querySelector('meta[property="og:description"]')?.getAttribute('content') ||
                         'No description available';

      // Extract main content
      let content = '';

      // Try to find main content areas
      const mainContentSelectors = [
        'main',
        'article',
        '[role="main"]',
        '.content',
        '.post-content',
        '.article-content',
        '.entry-content',
        '#content',
        '#main'
      ];

      let mainElement = null;
      for (const selector of mainContentSelectors) {
        mainElement = document.querySelector(selector);
        if (mainElement) break;
      }

      if (mainElement) {
        // Extract text from main content area
        content = this.extractTextContent(mainElement);
      } else {
        // Fallback: extract from body, excluding navigation and footer
        const body = document.body;
        if (body) {
          // Remove navigation, header, footer, sidebar elements
          const elementsToRemove = body.querySelectorAll('nav, header, footer, aside, .nav, .header, .footer, .sidebar, .menu');
          elementsToRemove.forEach((el: Element) => el.remove());
          
          content = this.extractTextContent(body);
        }
      }

      // Clean up content
      content = this.cleanContent(content);

      return {
        title,
        description,
        content: content.substring(0, 5000), // Limit content length
        url
      };

    } catch (error) {
      console.error('Error crawling URL:', error);
      return {
        title: 'Error',
        description: 'Failed to extract content',
        content: '',
        url,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private static extractTextContent(element: Element): string {
    // Remove script and style elements
    const scripts = element.querySelectorAll('script, style');
    scripts.forEach(script => script.remove());

    // Get text content
    let text = element.textContent || '';
    
    // Clean up whitespace
    text = text.replace(/\s+/g, ' ').trim();
    
    return text;
  }

  private static cleanContent(content: string): string {
    // Remove extra whitespace and normalize
    return content
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
  }
} 
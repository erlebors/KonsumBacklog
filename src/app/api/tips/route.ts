import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { tipsService, Tip } from '@/lib/tipsService';
import { foldersService } from '@/lib/foldersService';
import { crawlWebPage } from '@/lib/webCrawler';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET() {
  try {
    const tips = await tipsService.getAllTips();
    return NextResponse.json(tips);
  } catch (error) {
    console.error('Error fetching tips:', error);
    return NextResponse.json({ error: 'Failed to fetch tips' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { content, url } = await request.json();

    let pageContent = '';
    let pageTitle = '';

    // Crawl webpage if URL is provided
    if (url) {
      const crawledContent = await crawlWebPage(url);
      if (crawledContent) {
        pageContent = crawledContent.content;
        pageTitle = crawledContent.title || '';
      }
    }

    // Get custom folder names for AI categorization
    const customFolders = await foldersService.getFolderNames();
    const folderList = customFolders.length > 0 
      ? `Available custom folders: ${customFolders.join(', ')}` 
      : 'No custom folders available';

    // Prepare AI prompt with webpage content and custom folders
    const aiPrompt = `Analyze this tip and categorize it appropriately. 

Tip content: ${content}
${url ? `URL: ${url}` : ''}

${pageContent ? `Webpage content: ${pageContent}` : ''}

${folderList}

Please provide a JSON response with the following structure:
{
  "category": "specific folder name based on content. If the content fits well with one of the available custom folders, use that folder name. Otherwise, create a new meaningful folder name (e.g., 'Design Resources', 'Programming Tips', 'Business Strategy')",
  "urgency": "high/medium/low",
  "priority": 1-10,
  "pageSummary": "exactly 3 bullet points summarizing the webpage content, each starting with • and being a complete sentence. If no webpage content, provide 3 bullet points about the tip content itself."
}

Focus on using existing custom folders when the content fits well, or creating meaningful, specific folder names that group related content together. For the page summary, provide exactly 3 complete, standalone bullet points that summarize the key information.`;

    let aiResponse;
    try {
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that categorizes and summarizes tips. Always respond with valid JSON only.'
          },
          {
            role: 'user',
            content: aiPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      aiResponse = completion.choices[0]?.message?.content;
    } catch (aiError) {
      console.error('AI processing failed:', aiError);
      // Fallback categorization
      aiResponse = JSON.stringify({
        category: 'General Tips',
        urgency: 'medium',
        priority: 5,
        pageSummary: '• Tip saved for future reference\n• Content requires manual review\n• Consider organizing into relevant category'
      });
    }

    // Parse AI response
    let parsedResponse;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = aiResponse?.match(/```json\s*([\s\S]*?)\s*```/) || 
                       aiResponse?.match(/\{[\s\S]*\}/);
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : aiResponse;
      parsedResponse = JSON.parse(jsonString || '{}');
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      parsedResponse = {
        category: 'General Tips',
        urgency: 'medium',
        priority: 5,
        pageSummary: '• Tip saved for future reference\n• Content requires manual review\n• Consider organizing into relevant category'
      };
    }

    // Determine title for the tip
    let tipTitle = '';
    if (pageTitle) {
      tipTitle = pageTitle;
    } else if (url) {
      try {
        const urlObj = new URL(url);
        tipTitle = urlObj.hostname.replace('www.', '');
      } catch {
        tipTitle = content.substring(0, 30) + (content.length > 30 ? '...' : '');
      }
    } else if (content) {
      tipTitle = content.substring(0, 30) + (content.length > 30 ? '...' : '');
    } else {
      tipTitle = 'Untitled';
    }

    // Create the tip with all required fields
    const tip: Tip = {
      id: Date.now().toString(),
      content,
      url: url || '',
      title: tipTitle,
      relevanceDate: null,
      relevanceEvent: null,
      createdAt: new Date().toISOString(),
      folder: parsedResponse.category || 'General Tips',
      priority: parsedResponse.priority?.toString() || '5',
      summary: parsedResponse.pageSummary || '• Tip saved for future reference\n• Content requires manual review\n• Consider organizing into relevant category',
      tags: [],
      actionRequired: false,
      estimatedTime: undefined,
      isProcessed: false,
      aiProcessed: true,
      userContext: '',
      needsMoreInfo: false,
      urgencyLevel: parsedResponse.urgency || 'medium'
    };

    await tipsService.addTip(tip);

    return NextResponse.json(tip);
  } catch (error) {
    console.error('Error creating tip:', error);
    return NextResponse.json({ error: 'Failed to create tip' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ error: 'Tip ID is required' }, { status: 400 });
    }

    await tipsService.deleteTip(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tip:', error);
    return NextResponse.json({ error: 'Failed to delete tip' }, { status: 500 });
  }
} 
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
    const { content } = await request.json();

    // Parse multiple tips from content
    const tips = await parseMultipleTips(content);

    // Save all tips
    const savedTips = [];
    for (const tip of tips) {
      await tipsService.addTip(tip);
      savedTips.push(tip);
    }

    return NextResponse.json({
      tips: savedTips,
      count: savedTips.length,
      aiProcessed: true
    });
  } catch (error) {
    console.error('Error creating tips:', error);
    return NextResponse.json({ error: 'Failed to create tips' }, { status: 500 });
  }
}

async function parseMultipleTips(content: string): Promise<Tip[]> {
  // If no content, return empty array
  if (!content.trim()) {
    return [];
  }

  // Get custom folder names for AI categorization
  const customFolders = await foldersService.getFolderNames();
  const folderList = customFolders.length > 0 
    ? `Available custom folders: ${customFolders.join(', ')}` 
    : 'No custom folders available';

  // AI prompt to parse multiple tips
  const aiPrompt = `Parse this content into multiple separate tips and categorize them appropriately.

Content: ${content}

${folderList}

Please provide a JSON response with the following structure:
{
  "tips": [
    {
      "content": "individual tip content",
      "title": "short descriptive title",
      "category": "folder name (use existing custom folders when appropriate, or create meaningful new ones)",
      "urgency": "high/medium/low",
      "priority": 1-10,
      "summary": "exactly 3 bullet points summarizing this tip, each starting with • and being a complete sentence",
      "url": "extract any URL from the content if present, otherwise empty string"
    }
  ]
}

Guidelines:
- Split content by commas, "and", "or", or other logical separators
- Each tip should be a distinct item or location
- Group related tips under the same folder name
- Use existing custom folders when content fits well
- Create meaningful folder names for new categories
- Each tip should have its own summary with exactly 3 bullet points
- Extract URLs from content and include them in the url field
- If content contains a URL, use the URL as the primary content and extract a meaningful title`;

  let aiResponse;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that parses content into multiple tips and categorizes them. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: aiPrompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    aiResponse = completion.choices[0]?.message?.content;
  } catch (aiError) {
    console.error('AI processing failed:', aiError);
    // Fallback: treat as single tip
    return [await processSingleTip(content)];
  }

  // Parse AI response
  let parsedResponse;
  try {
    const jsonMatch = aiResponse?.match(/```json\s*([\s\S]*?)\s*```/) || 
                     aiResponse?.match(/\{[\s\S]*\}/);
    const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : aiResponse;
    parsedResponse = JSON.parse(jsonString || '{}');
  } catch (parseError) {
    console.error('Failed to parse AI response:', parseError);
    // Fallback: treat as single tip
    return [await processSingleTip(content)];
  }

  // Convert parsed tips to Tip objects
  const tips: Tip[] = [];
  const tipArray = parsedResponse.tips || [];
  
  for (const tipData of tipArray) {
    // Process each tip to get webpage content if URL is present
    const processedTip = await processSingleTip(tipData.content, tipData.url);
    
    // Override with AI-categorized data
    const tip: Tip = {
      ...processedTip,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      content: tipData.content || processedTip.content,
      url: tipData.url || processedTip.url,
      title: tipData.title || processedTip.title,
      folder: tipData.category || processedTip.folder,
      priority: tipData.priority?.toString() || processedTip.priority,
      summary: tipData.summary || processedTip.summary,
      urgencyLevel: tipData.urgency || processedTip.urgencyLevel
    };
    tips.push(tip);
  }

  return tips;
}

async function processSingleTip(content: string, url?: string): Promise<Tip> {
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

  return tip;
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
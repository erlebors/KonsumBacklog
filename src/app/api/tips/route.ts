import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { firestoreService } from '@/lib/firestoreService';
import { foldersService } from '@/lib/foldersService';
import { getCurrentUser } from '@/lib/authUtils';
import { crawlWebPage } from '@/lib/webCrawler';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUser(request);
    
    if (!userId) {
      return NextResponse.json([]);
    }
    
    const tips = await firestoreService.getAllTips(userId);
    return NextResponse.json(tips);
  } catch (error) {
    console.error('Error fetching tips:', error);
    return NextResponse.json({ error: 'Failed to fetch tips' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUser(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    const { content, selectedFolder } = body;
    
    console.log('Full request body:', body);
    console.log('Extracted selectedFolder:', selectedFolder);
    console.log('Extracted content:', content);
    
    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }
    
    // Check if content contains multiple items
    const items = content.split(/[,]|(\s+and\s+)|(\s+or\s+)/).filter((item: string) => item.trim());
    
    console.log('Content splitting - original:', content, 'items:', items, 'itemCount:', items.length);
    
    let processedTips = [];
    
    if (items.length > 1) {
      console.log('Using parseMultipleTips function');
      // Process multiple tips
      processedTips = await parseMultipleTips(content, selectedFolder);
    } else {
      console.log('Using processSingleTip function');
      // Process single tip
      console.log('About to call processSingleTip with content:', content, 'selectedFolder:', selectedFolder);
      const tip = await processSingleTip(content, undefined, selectedFolder);
      console.log('processSingleTip returned tip with folder:', tip.folder);
      processedTips = [tip];
    }
    
    // Save tips to database
    const savedTips = [];
    for (const tipData of processedTips) {
      console.log('Saving tip to database - folder:', tipData.folder, 'content:', tipData.content?.substring(0, 50));
      const savedTip = await firestoreService.addTip(userId, {
        content: tipData.content,
        url: tipData.url || '',
        title: tipData.title || '',
        relevanceDate: null,
        relevanceEvent: null,
        createdAt: new Date().toISOString(),
        folder: tipData.folder || 'General Tips',
        priority: tipData.priority || '5',
        summary: tipData.summary || '',
        tags: tipData.tags || [],
        actionRequired: tipData.actionRequired || false,
        estimatedTime: tipData.estimatedTime || '',
        isProcessed: false,
        aiProcessed: true,
        urgencyLevel: tipData.urgencyLevel || 'medium'
      });
      console.log('Saved tip result - folder:', savedTip.folder);
      savedTips.push(savedTip);
    }
    
    return NextResponse.json({
      tips: savedTips,
      aiProcessed: true
    });
  } catch (error) {
    console.error('Error saving tip:', error);
    return NextResponse.json({ error: 'Failed to save tip' }, { status: 500 });
  }
}

async function parseMultipleTips(content: string, selectedFolder?: string) {
  // If no content, return empty array
  if (!content.trim()) {
    return [];
  }
  
  // If a folder is selected, use it directly without AI categorization
  if (selectedFolder && selectedFolder.trim()) {
    console.log('parseMultipleTips - using selected folder:', selectedFolder);
    const items = content.split(/[,\n]+/).map((item: string) => item.trim()).filter((item: string) => item);
    const tips = [];
    
    for (const item of items) {
      const tip = await processSingleTip(item, undefined, selectedFolder);
      tips.push(tip);
    }
    
    return tips;
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
    return [await processSingleTip(content)];
  }

  // Process each tip
  const tips = [];
  for (const tipData of parsedResponse.tips || []) {
    const tip = await processSingleTip(tipData.content, tipData.url, tipData.category);
    tips.push(tip);
  }

  return tips;
}

async function processSingleTip(content: string, url?: string, folder?: string) {
  
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

  // If a folder is selected, use it directly instead of AI categorization
  if (folder && folder.trim()) {
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
    }

    // Generate summary using AI but keep the selected folder
    let summary = '';
    // Removed AI summary generation - tips will be saved without summaries
    summary = '';

    const result = {
      content: content,
      url: url || '',
      title: tipTitle,
      relevanceDate: null,
      relevanceEvent: null,
      createdAt: new Date().toISOString(),
      folder: folder, // Use the selected folder
      priority: '5',
      summary: summary,
      tags: [],
      actionRequired: false,
      estimatedTime: '',
      isProcessed: false,
      aiProcessed: true,
      urgencyLevel: 'medium'
    };
    
    return result;
  }

  // If no folder is selected, use AI categorization as before
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
  "priority": 1-10
}

Focus on using existing custom folders when the content fits well, or creating meaningful, specific folder names that group related content together.`;

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
  }

  return {
    content: content,
    url: url || '',
    title: tipTitle,
    relevanceDate: null,
    relevanceEvent: null,
    createdAt: new Date().toISOString(),
    folder: parsedResponse.category || 'General Tips',
    priority: parsedResponse.priority?.toString() || '5',
    summary: '', // Removed AI summary - tips will be saved without summaries
    tags: [],
    actionRequired: false,
    estimatedTime: '',
    isProcessed: false,
    aiProcessed: true,
    urgencyLevel: parsedResponse.urgency || 'medium'
  };
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUser(request);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const tipId = searchParams.get('id');
    
    if (!tipId) {
      return NextResponse.json({ error: 'Tip ID is required' }, { status: 400 });
    }
    
    await firestoreService.deleteTip(userId, tipId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tip:', error);
    return NextResponse.json({ error: 'Failed to delete tip' }, { status: 500 });
  }
}

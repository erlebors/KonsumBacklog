import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { foldersService } from '@/lib/foldersService';
import { firestoreService } from '@/lib/firestoreService';
import { getCurrentUser, isDemoMode } from '@/lib/authUtils';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { content, selectedFolder } = await request.json();

    // If no content, return empty array
    if (!content.trim()) {
      return NextResponse.json({ tips: [] });
    }

    // If a folder is selected, use it directly without AI categorization
    if (selectedFolder && selectedFolder.trim()) {
      const items = content.split(/[,\n]+/).map((item: string) => item.trim()).filter((item: string) => item);
      const tips = items.map((item: string) => ({
        content: item,
        title: item.substring(0, 30) + (item.length > 30 ? '...' : ''),
        category: selectedFolder,
        url: ''
      }));
      
      return NextResponse.json({ tips });
    }

    // Get custom folder names for AI categorization
    let customFolders: string[];
    
    // Try to get authenticated user first
    const userId = await getCurrentUser(request);
    
    if (userId && !isDemoMode()) {
      // Use Firestore for authenticated users when Firebase Admin is configured
      try {
        customFolders = await firestoreService.getFolderNames(userId);
      } catch (error) {
        console.error('Error fetching from Firestore, falling back to demo mode:', error);
        customFolders = await foldersService.getFolderNames();
      }
    } else {
      // Use demo mode for unauthenticated users or when Firebase Admin is not configured
      customFolders = await foldersService.getFolderNames();
    }
    
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
- Keep titles short and descriptive
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
        max_tokens: 800,
      });

      aiResponse = completion.choices[0]?.message?.content;
    } catch (aiError) {
      console.error('AI processing failed:', aiError);
      // Fallback: treat as single tip
      return NextResponse.json({
        tips: [{
          content: content,
          title: content.substring(0, 30) + (content.length > 30 ? '...' : ''),
          category: 'General Tips',
          url: ''
        }]
      });
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
      return NextResponse.json({
        tips: [{
          content: content,
          title: content.substring(0, 30) + (content.length > 30 ? '...' : ''),
          category: 'General Tips',
          url: ''
        }]
      });
    }

    // Return preview data
    const tips = parsedResponse.tips || [];
    return NextResponse.json({ tips });

  } catch (error) {
    console.error('Error previewing tips:', error);
    return NextResponse.json({ error: 'Failed to preview tips' }, { status: 500 });
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { AzureOpenAI } from 'openai';
import { promises as fs } from 'fs';
import path from 'path';

// In-memory storage for demo purposes
// In production, you'd use a database
let tips: any[] = [];

// Load tips from file on startup
const loadTips = async () => {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'tips.json');
    const data = await fs.readFile(dataPath, 'utf-8');
    tips = JSON.parse(data);
  } catch (error) {
    // File doesn't exist yet, start with empty array
    tips = [];
  }
};

// Save tips to file
const saveTips = async () => {
  try {
    const dataPath = path.join(process.cwd(), 'data');
    await fs.mkdir(dataPath, { recursive: true });
    await fs.writeFile(
      path.join(dataPath, 'tips.json'),
      JSON.stringify(tips, null, 2)
    );
  } catch (error) {
    console.error('Error saving tips:', error);
  }
};

// Initialize tips on module load
loadTips();

// Function to extract JSON from AI response
const extractJSONFromResponse = (response: string): any => {
  try {
    // First, try to parse as direct JSON
    return JSON.parse(response);
  } catch (error) {
    // If that fails, try to extract JSON from markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch (parseError) {
        console.error('Error parsing JSON from markdown:', parseError);
        throw parseError;
      }
    }
    
    // If no markdown blocks, try to find JSON object in the text
    const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
      try {
        return JSON.parse(jsonObjectMatch[0]);
      } catch (parseError) {
        console.error('Error parsing JSON object from text:', parseError);
        throw parseError;
      }
    }
    
    throw new Error('No valid JSON found in response');
  }
};

// Function to parse relative dates from natural language
const parseRelativeDate = (text: string): string | null => {
  const today = new Date();
  const lowerText = text.toLowerCase();
  
  // Common relative date patterns
  const patterns = [
    { pattern: /this weekend|next weekend/, days: 2 }, // This weekend
    { pattern: /next week/, days: 7 }, // Next week
    { pattern: /in (\d+) days?/, extract: (match: RegExpMatchArray) => parseInt(match[1]) },
    { pattern: /in (\d+) weeks?/, extract: (match: RegExpMatchArray) => parseInt(match[1]) * 7 },
    { pattern: /in (\d+) months?/, extract: (match: RegExpMatchArray) => parseInt(match[1]) * 30 },
    { pattern: /tomorrow/, days: 1 },
    { pattern: /today/, days: 0 },
    { pattern: /next month/, days: 30 },
    { pattern: /next year/, days: 365 },
    { pattern: /asap|urgent|immediately/, days: 0 },
    { pattern: /soon/, days: 3 },
    { pattern: /later/, days: 14 },
    { pattern: /next (\w+)/, extract: (match: RegExpMatchArray) => {
      const day = match[1];
      const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const targetDay = daysOfWeek.indexOf(day);
      if (targetDay !== -1) {
        const currentDay = today.getDay();
        const daysUntil = (targetDay - currentDay + 7) % 7;
        return daysUntil === 0 ? 7 : daysUntil;
      }
      return null;
    }}
  ];

  for (const pattern of patterns) {
    const match = lowerText.match(pattern.pattern);
    if (match) {
      let daysToAdd: number | null = null;
      if ('extract' in pattern && pattern.extract) {
        daysToAdd = pattern.extract(match);
      } else if ('days' in pattern) {
        daysToAdd = pattern.days;
      }
      if (daysToAdd !== null && daysToAdd !== undefined) {
        const resultDate = new Date(today);
        resultDate.setDate(today.getDate() + daysToAdd);
        return resultDate.toISOString().split('T')[0];
      }
    }
  }
  
  return null;
};

// AI processing function
const processTipWithAI = async (tip: any) => {
  try {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const modelName = process.env.AZURE_OPENAI_MODEL_NAME;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION;

    if (!endpoint || !modelName || !deployment || !apiKey || !apiVersion) {
      console.warn('Azure OpenAI credentials not configured, skipping AI processing');
      return {
        ...tip,
        needsMoreInfo: true
      };
    }

    console.log('Processing tip with AI...');
    const options = { endpoint, apiKey, deployment, apiVersion };
    const client = new AzureOpenAI(options);

    const prompt = `
    You are an expert information organizer. Analyze this tip and provide structured information to help organize it effectively.

    TIP INFORMATION:
    Content: ${tip.content || 'N/A'}
    URL: ${tip.url || 'N/A'}
    Relevance Date: ${tip.relevanceDate || 'N/A'}
    Relevance Event: ${tip.relevanceEvent || 'N/A'}

    TASK: Provide a JSON response with the following structure:
    {
      "folder": "Create a specific, contextual folder name (e.g., 'Roadtrip to DC', 'Project Alpha Planning', 'Home Renovation Ideas', 'Career Development 2024')",
      "priority": "High/Medium/Low based on urgency and importance",
      "summary": "A concise 1-2 sentence summary of the key information",
      "tags": ["3-5", "relevant", "tags", "for", "searching"],
      "actionRequired": "true/false - whether this tip requires any action",
      "estimatedTime": "Quick/Medium/Long - estimated time to process this tip",
      "needsMoreInfo": "true/false - whether this tip needs additional context from the user to be properly organized",
      "extractedDate": "YYYY-MM-DD format if you can extract a specific date from the content, or null if no date found",
      "urgencyLevel": "Immediate/This Week/This Month/Later - based on time sensitivity"
    }

    GUIDELINES:
    - Folder: Create a specific, descriptive folder name that groups related tips together. Examples:
      * "Roadtrip to DC" for travel tips about visiting Washington DC
      * "Project Alpha Planning" for work-related project planning
      * "Home Renovation Ideas" for home improvement tips
      * "Career Development 2024" for professional development
      * "Health & Fitness Goals" for wellness-related tips
      * "Learning - React Development" for educational content
    - Priority: High for urgent/time-sensitive items, Medium for important but not urgent, Low for general reference
    - Summary should capture the essence of the tip
    - Tags should be specific and searchable
    - Action Required: true if the tip needs follow-up or action, false if it's just reference material
    - Estimated Time: Quick (<15 min), Medium (15-60 min), Long (>60 min)
    - Needs More Info: true if the tip lacks context about when/why it's relevant, false if it's self-contained
    - Extracted Date: Look for specific dates, relative dates (e.g., "this weekend", "next week", "in 2 weeks"), or time-sensitive language in the content
    - Urgency Level: 
      * "Immediate" for today/tomorrow/ASAP
      * "This Week" for this week/next few days
      * "This Month" for next week/this month
      * "Later" for next month or beyond

    DATE EXTRACTION EXAMPLES:
    - "roadtrip is this weekend" → extractedDate: calculate this weekend's date
    - "meeting with john is in two weeks" → extractedDate: calculate date in 2 weeks
    - "deadline is next Friday" → extractedDate: calculate next Friday's date
    - "urgent task" → urgencyLevel: "Immediate"
    - "planning for next month" → urgencyLevel: "This Month"

    Respond ONLY with valid JSON. Do not include any other text, markdown formatting, or code blocks.
    `;

    const response = await client.chat.completions.create({
      messages: [
        { 
          role: "system", 
          content: "You are a helpful assistant that categorizes and organizes information. You always respond with valid JSON only. Never include explanations, markdown formatting, or additional text outside the JSON structure." 
        },
        { role: "user", content: prompt }
      ],
      max_tokens: 800,
      temperature: 0.3,
      model: modelName
    });

    if (response?.choices?.[0]?.message?.content) {
      try {
        const aiAnalysis = extractJSONFromResponse(response.choices[0].message.content);
        console.log('AI Analysis:', aiAnalysis);
        
        // Parse relative dates from content if AI didn't extract a specific date
        let finalDate = tip.relevanceDate || aiAnalysis.extractedDate;
        if (!finalDate && tip.content) {
          finalDate = parseRelativeDate(tip.content);
        }
        
        return {
          ...tip,
          folder: aiAnalysis.folder || 'Uncategorized',
          priority: aiAnalysis.priority || 'Medium',
          summary: aiAnalysis.summary || '',
          tags: aiAnalysis.tags || [],
          actionRequired: aiAnalysis.actionRequired || false,
          estimatedTime: aiAnalysis.estimatedTime || 'Medium',
          needsMoreInfo: aiAnalysis.needsMoreInfo || true,
          relevanceDate: finalDate,
          urgencyLevel: aiAnalysis.urgencyLevel || 'Later',
          aiProcessed: true,
          aiProcessedAt: new Date().toISOString()
        };
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        console.error('Raw AI response:', response.choices[0].message.content);
        return {
          ...tip,
          aiProcessed: false,
          aiError: 'Failed to parse AI response',
          needsMoreInfo: true
        };
      }
    }
  } catch (error) {
    console.error('Error processing tip with AI:', error);
    return {
      ...tip,
      aiProcessed: false,
      aiError: error instanceof Error ? error.message : 'Unknown AI error',
      needsMoreInfo: true
    };
  }
  
  return {
    ...tip,
    needsMoreInfo: true
  };
};

export async function GET() {
  try {
    return NextResponse.json({ tips });
  } catch (error) {
    console.error('Error fetching tips:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tips' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, url, relevanceDate, relevanceEvent } = body;

    if (!content && !url) {
      return NextResponse.json(
        { error: 'Content or URL is required' },
        { status: 400 }
      );
    }

    const newTip = {
      id: Date.now().toString(),
      content: content || '',
      url: url || '',
      relevanceDate: relevanceDate || null,
      relevanceEvent: relevanceEvent || null,
      createdAt: new Date().toISOString(),
      isProcessed: false
    };

    // Process with AI
    const processedTip = await processTipWithAI(newTip);
    
    tips.push(processedTip);
    await saveTips();

    return NextResponse.json({ 
      message: 'Tip created successfully',
      tip: processedTip 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating tip:', error);
    return NextResponse.json(
      { error: 'Failed to create tip' },
      { status: 500 }
    );
  }
} 
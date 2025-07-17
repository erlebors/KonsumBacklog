import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    // Check if the API key is set
    if (!apiKey) {
      return NextResponse.json({
        status: 'error',
        message: 'Missing OpenAI API key',
        missing: ['OPENAI_API_KEY']
      }, { status: 400 });
    }

    // Test the connection with a simple prompt
    const client = new OpenAI({
      apiKey: apiKey
    });

    const response = await client.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Respond with 'AI is working correctly' and nothing else." }
      ],
      max_tokens: 50,
      temperature: 0,
      model: 'gpt-4o-mini'
    });

    const aiResponse = response?.choices?.[0]?.message?.content;

    return NextResponse.json({
      status: 'success',
      message: 'OpenAI is configured and working',
      aiResponse,
      config: {
        apiKey: apiKey ? 'Set' : 'Missing',
        model: 'gpt-4o-mini'
      }
    });

  } catch (error) {
    console.error('AI Test Error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to connect to OpenAI',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
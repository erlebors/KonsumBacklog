import { NextResponse } from 'next/server';
import { AzureOpenAI } from 'openai';

export async function GET() {
  try {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const modelName = process.env.AZURE_OPENAI_MODEL_NAME;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION;

    // Check if all required environment variables are set
    const missingVars = [];
    if (!endpoint) missingVars.push('AZURE_OPENAI_ENDPOINT');
    if (!modelName) missingVars.push('AZURE_OPENAI_MODEL_NAME');
    if (!deployment) missingVars.push('AZURE_OPENAI_DEPLOYMENT');
    if (!apiKey) missingVars.push('AZURE_OPENAI_API_KEY');
    if (!apiVersion) missingVars.push('AZURE_OPENAI_API_VERSION');

    if (missingVars.length > 0) {
      return NextResponse.json({
        status: 'error',
        message: 'Missing Azure OpenAI credentials',
        missing: missingVars
      }, { status: 400 });
    }

    // Test the connection with a simple prompt
    const options = { endpoint, apiKey, deployment, apiVersion };
    const client = new AzureOpenAI(options);

    const response = await client.chat.completions.create({
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Respond with 'AI is working correctly' and nothing else." }
      ],
      max_tokens: 50,
      temperature: 0,
      model: modelName as string
    });

    const aiResponse = response?.choices?.[0]?.message?.content;

    return NextResponse.json({
      status: 'success',
      message: 'Azure OpenAI is configured and working',
      aiResponse,
      config: {
        endpoint: endpoint ? 'Set' : 'Missing',
        modelName,
        deployment,
        apiVersion
      }
    });

  } catch (error) {
    console.error('AI Test Error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to connect to Azure OpenAI',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 
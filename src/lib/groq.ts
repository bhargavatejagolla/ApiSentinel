import Groq from 'groq-sdk';

const apiKey = process.env.GROQ_API_KEY;

// Create the client instance if key is available.
// If the key is missing, we don't throw immediately so that the server starts up fine,
// but we will throw an error when chat completions are invoked.
export const groqClient = apiKey ? new Groq({ apiKey }) : null;

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function getChatCompletion(
  messages: ChatMessage[],
  jsonMode: boolean = false,
  modelName: string = 'llama-3.3-70b-versatile'
): Promise<string> {
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is missing. Please configure it in your .env.local file.');
  }

  if (!groqClient) {
    throw new Error('Groq SDK client is not initialized. Please ensure your GROQ_API_KEY is valid.');
  }

  try {
    const response = await groqClient.chat.completions.create({
      messages,
      model: modelName,
      temperature: 0.1, // Low temperature for highly predictable and structured security/performance analysis
      response_format: jsonMode ? { type: 'json_object' } : undefined,
    });

    return response.choices[0]?.message?.content || '';
  } catch (error: any) {
    console.error('Error invoking Groq SDK:', error);
    throw new Error(`Groq API error: ${error?.message || error}`);
  }
}

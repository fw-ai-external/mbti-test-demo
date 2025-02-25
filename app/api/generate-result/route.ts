import { NextResponse } from 'next/server';

interface QuestionAnswer {
  question: string;
  answer: string;
}

export async function POST(request: Request) {
  const { apiKey, answers } = await request.json();

  try {
    const response = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "accounts/fireworks/models/deepseek-r1",
        max_tokens: 16384,
        top_p: 1,
        top_k: 40,
        presence_penalty: 0,
        frequency_penalty: 0,
        temperature: 0.6,
        stream: true,
        response_format: { "type": "json_object" , "schema": {'properties': {'mbti': {'title': 'Mbti', 'type': 'string'}}, 'required': ['mbti'], 'title': 'Answer', 'type': 'object'}},
        messages: [
          {
            role: "user",
            content: `You are an expert MBTI personality analyzer. Analyze these responses to determine the user's MBTI type.

            Consider these key aspects in your analysis:
            - Look for patterns in how the person approaches different situations
            - Consider their decision-making style across scenarios
            - Analyze their energy sources and information processing preferences
            - Evaluate their interaction style and environmental preferences
            
            Here are the user's responses to various scenario-based questions:
            ${answers.map((qa: QuestionAnswer) => 
              `Question: "${qa.question}"
               Answer: "${qa.answer}"`
            ).join("\n\n")}
            
            Base your analysis on the overall pattern of responses rather than individual answers.
            In the end, respond with the user's MBTI in JSON format:
            {"mbti": "XXXX"}`
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Fireworks API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      return NextResponse.json({ 
        error: `API request failed: ${response.status} ${response.statusText}` 
      }, { status: response.status });
    }

    // Return the stream
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate result' }, { status: 500 });
  }
} 
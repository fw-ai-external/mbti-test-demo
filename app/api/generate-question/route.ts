import { NextResponse } from 'next/server';

interface QuestionHistory {
  question: string;
  answer: string;
}

export async function POST(request: Request) {
  const { apiKey, previousAnswers, previousQuestions } = await request.json();
  
  if (!apiKey) {
    return NextResponse.json({ 
      error: 'No API key provided. Please provide an API key through the UI.' 
    }, { status: 401 });
  }

  try {
    const response = await fetch("https://api.fireworks.ai/inference/v1/chat/completions", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "accounts/fireworks/models/llama-v3p3-70b-instruct",
        max_tokens: 16384,
        top_p: 1,
        top_k: 40,
        presence_penalty: 0,
        frequency_penalty: 0.8,
        temperature: 2.0,
        response_format: { "type": "json_object" , "schema": {'properties': {'question': {'title': 'Question', 'type': 'string'}, 'choices': {'items': {'type': 'string'}, 'title': 'Choices', 'type': 'array'}}, 'required': ['question', 'choices'], 'title': 'answer', 'type': 'object'}},
        messages: [
          {
            role: "system",
            content: `You are an expert MBTI personality test designer. Generate subtle, situational questions that indirectly reveal personality traits.
            
            Consider these MBTI dimensions when creating questions:
            1. Energy Source (E/I):
               - Social interaction vs solitude
               - External vs internal processing
               - Breadth vs depth of interests
            
            2. Information Processing (S/N):
               - Concrete vs abstract thinking
               - Present reality vs future possibilities
               - Practical vs theoretical approaches
            
            3. Decision Making (T/F):
               - Logic vs values-based decisions
               - Objective vs subjective reasoning
               - Task-focused vs people-focused
            
            4. Life Structure (J/P):
               - Planning vs spontaneity
               - Structure vs flexibility
               - Closure vs openness to new information

            Your questions should:
            - Target one or two MBTI dimensions at a time
            - Use real-life scenarios that reveal natural preferences
            - Avoid obvious personality indicators
            - Be engaging and relatable
            - Have 4 distinct choices that map to different MBTI preferences
            - Not mention MBTI terms directly
            - Make sure to ask dissimilar question to those already asked before
            
            You must respond with a JSON object in this exact format:
            {
              "question": "the scenario-based question here",
              "choices": [
                "choice describing one natural reaction/preference",
                "choice describing another natural reaction/preference",
                "choice describing another natural reaction/preference",
                "choice describing another natural reaction/preference"
              ]
            }
            
            Example question format:
            "When you're working on a group project and someone suggests an unconventional approach, you typically..."
            Instead of:
            "Do you prefer working alone or in groups?"
            `
          },
          {
            role: "user",
            content: previousQuestions.length > 0 
              ? `Previous questions asked:
                 ${previousQuestions.map((q: QuestionHistory) => `"${q.question}"`).join("\n")}
                 
                 Generate the next question that explores different MBTI dimensions than the previous ones.
                 Make sure this question doesn't overlap with themes already covered and targets underexplored dimensions.
                 Avoid similar scenarios to those already used.`
              : "Generate the first MBTI assessment question using a subtle, scenario-based approach."
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

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Since we're using JSON mode, this should always be valid JSON
    const parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
    
    // Validate the response structure
    if (!parsedContent.question || !Array.isArray(parsedContent.choices) || parsedContent.choices.length !== 4) {
      throw new Error('Invalid response format');
    }

    return NextResponse.json(parsedContent);
  } catch (error) {
    console.error('Error generating question:', error);
    return NextResponse.json({ 
      error: 'Failed to generate question. Please check your API key and try again.' 
    }, { status: 500 });
  }
} 
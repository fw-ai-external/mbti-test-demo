'use client'
import { useState, useEffect, useRef } from "react";

interface Question {
  question: string;
  choices: string[];
}

interface QuestionHistory {
  question: string;
  answer: string;
}

interface MBTIResult {
  type: string;
  explanation: string;
  thinking: string;
}

// First, let's create a QuestionSkeleton component
const QuestionSkeleton = () => (
  <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 animate-pulse">
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-40"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-full w-24"></div>
      </div>
      <div className="space-y-3">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </div>
    </div>
    
    <div className="space-y-4">
      {[...Array(4)].map((_, index) => (
        <div key={index} className="w-full p-6 border-2 border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full mr-4"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32"></div>
      </div>
    </div>
  </div>
);

export default function Home() {
  const [apiKey, setApiKey] = useState<string>("");
  const [showApiKeyModal, setShowApiKeyModal] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [streamedResult, setStreamedResult] = useState("");
  const [mbtiResult, setMbtiResult] = useState<MBTIResult>({ type: '', explanation: '', thinking: '' });
  const [currentThinking, setCurrentThinking] = useState('');
  const thinkingBoxRef = useRef<HTMLDivElement>(null);
  const [questionHistory, setQuestionHistory] = useState<QuestionHistory[]>([]);
  const [nextQuestion, setNextQuestion] = useState<Question | null>(null);

  // Add useEffect to auto-scroll
  useEffect(() => {
    if (thinkingBoxRef.current) {
      thinkingBoxRef.current.scrollTop = thinkingBoxRef.current.scrollHeight;
    }
  }, [currentThinking]);

  // Modify the question generation function to optionally store as next question
  const generateQuestion = async (storeAsNext: boolean = false) => {
    try {
      const response = await fetch('/api/generate-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey,
          previousAnswers: answers,
          previousQuestions: questionHistory.map(h => ({
            question: h.question,
            answer: h.answer
          }))
        }),
      });
      const data = await response.json();
      
      if (storeAsNext) {
        setNextQuestion(data);
      } else {
        setCurrentQuestion(data);
      }
    } catch (error) {
      console.error('Failed to generate question:', error);
    }
  };

  // Function to generate the next question
  const generateNextQuestion = async () => {
    setLoading(true);
    if (nextQuestion) {
      // Use pre-generated question
      setCurrentQuestion(nextQuestion);
      setNextQuestion(null);
      setLoading(false);
      // Start pre-generating the next question
      generateQuestion(true);
    } else {
      // Fall back to generating question now
      await generateQuestion(false);
      setLoading(false);
    }
  };

  // Start quiz after API key is provided
  const handleApiKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Test the API key first
      const testResponse = await fetch('/api/generate-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey,
          previousAnswers: [],
          previousQuestions: []
        }),
      });

      if (!testResponse.ok) {
        const errorData = await testResponse.json();
        throw new Error(errorData.error || 'Invalid API key');
      }

      setShowApiKeyModal(false);
      await generateNextQuestion();
      await generateQuestion(true);
    } catch (error) {
      console.error('Failed to start test:', error);
      alert('Invalid API key. Please check your API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handle answer selection
  const handleAnswerSelect = async (choice: string) => {
    const newAnswers = [...answers, choice];
    setAnswers(newAnswers);
    
    // Update question history
    if (currentQuestion) {
      setQuestionHistory(prev => [...prev, {
        question: currentQuestion.question,
        answer: choice
      }]);
    }
    
    if (newAnswers.length >= 10) {
      setAnalyzing(true);
      try {
        const response = await fetch('/api/generate-result', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            apiKey,
            answers: questionHistory.map(h => ({
              question: h.question,
              answer: h.answer
            }))
          }),
        });

        if (!response.ok) throw new Error('Failed to generate result');

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No reader available');

        let accumulatedResult = '';
        let isInThinkingBlock = false;
        let thinkingContent = '';
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            // Only log the final complete output
            console.log('Complete analysis:', {
              thinking: thinkingContent.replace(/<\/?think>/g, '').trim(),
              result: accumulatedResult.split('</think>').pop()?.trim()
            });
            break;
          }
          
          const chunk = new TextDecoder().decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            
            const jsonStr = line.slice(6).trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;

            try {
              const jsonData = JSON.parse(jsonStr);
              const content = jsonData.choices?.[0]?.delta?.content;
              if (!content) continue;
              
              accumulatedResult += content;

              // Handle thinking blocks
              if (content.includes('<think>')) {
                isInThinkingBlock = true;
              }
              if (isInThinkingBlock) {
                thinkingContent += content;
                if (content.includes('</think>')) {
                  isInThinkingBlock = false;
                }
                setCurrentThinking(thinkingContent);
              }

              // Only try to parse JSON after thinking block is complete
              if (!isInThinkingBlock && accumulatedResult.includes('</think>')) {
                const parts = accumulatedResult.split('</think>');
                if (parts.length > 1) {
                  const afterThinking = parts[parts.length - 1].trim();
                  if (afterThinking.includes('{') && afterThinking.includes('}')) {
                    try {
                      const jsonStartIndex = afterThinking.lastIndexOf('{');
                      const jsonEndIndex = afterThinking.lastIndexOf('}') + 1;
                      const jsonString = afterThinking.slice(jsonStartIndex, jsonEndIndex);
                      
                      const resultJson = JSON.parse(jsonString);
                      if (resultJson.mbti) {
                        setMbtiResult(prev => ({
                          ...prev,
                          type: resultJson.mbti,
                          thinking: thinkingContent.replace(/<\/?think>/g, '').trim()
                        }));
                        setAnalyzing(false);
                        setResult(resultJson.mbti);
                      }
                    } catch (e) {
                      // Continue accumulating if JSON is not complete
                    }
                  }
                }
              }

              setStreamedResult(accumulatedResult);
            } catch (e) {
              // Skip invalid chunks
              continue;
            }
          }
        }
      } catch (error) {
        console.error('Analysis failed:', error);
        setAnalyzing(false);
      }
    } else {
      generateNextQuestion();
    }
  };

  return (
    <div className="min-h-screen p-8 flex flex-col items-center justify-center">
      {showApiKeyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl mb-4">Enter your Fireworks AI API Key to Start MBTI Test</h2>
            <form onSubmit={handleApiKeySubmit}>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="border p-2 rounded w-full dark:bg-gray-700"
                placeholder="Enter your API key"
                required
                disabled={loading}
              />
              <button
                type="submit"
                className={`mt-4 w-full px-4 py-2 rounded ${
                  loading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-500 hover:bg-blue-600'
                } text-white`}
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-t-2 border-b-2 border-white rounded-full animate-spin mr-2"></div>
                    Verifying...
                  </div>
                ) : (
                  'Start Test'
                )}
              </button>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                Get your API key from{' '}
                <a 
                  href="https://fireworks.ai" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Fireworks.ai
                </a>
              </p>
            </form>
          </div>
        </div>
      )}

      <main className="max-w-2xl w-full">
        {loading ? (
          <QuestionSkeleton />
        ) : analyzing ? (
          <div className="text-center space-y-4">
            <h2 className="text-2xl mb-4">DeepSeek R1 is analyzing your MBTI....</h2>
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
            {currentThinking && (
              <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-left">
                <h3 className="font-semibold mb-2">Thinking Process:</h3>
                <div 
                  ref={thinkingBoxRef}
                  className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap h-[400px] overflow-y-auto"
                >
                  {currentThinking.replace(/<\/?think>/g, '')}
                </div>
              </div>
            )}
          </div>
        ) : result ? (
          <div className="text-center space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
              <h2 className="text-2xl mb-4">Your MBTI Result</h2>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{mbtiResult.type}</p>
            </div>
            {mbtiResult.thinking && (
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                <h3 className="text-xl mb-3">Analysis Process</h3>
                <p className="text-gray-700 dark:text-gray-300 text-left whitespace-pre-wrap">
                  {mbtiResult.thinking}
                </p>
              </div>
            )}
          </div>
        ) : currentQuestion && (
          <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                  Question {answers.length + 1} of 10
                </h2>
                <span className="px-4 py-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-sm font-medium">
                  {Math.round((answers.length / 10) * 100)}% Complete
                </span>
              </div>
              <p className="text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
                {currentQuestion.question}
              </p>
            </div>
            
            <div className="space-y-3">
              {currentQuestion.choices.map((choice, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(choice)}
                  className="w-full p-6 text-left border-2 border-gray-200 dark:border-gray-700 rounded-lg 
                             hover:border-blue-500 dark:hover:border-blue-400 
                             hover:bg-blue-50 dark:hover:bg-gray-700
                             transition-all duration-200 ease-in-out
                             group"
                >
                  <div className="flex items-center">
                    <span className="w-8 h-8 flex items-center justify-center rounded-full 
                                   bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400
                                   group-hover:bg-blue-100 group-hover:text-blue-600
                                   mr-4 font-medium">
                      {String.fromCharCode(65 + index)}
                    </span>
                    <span className="text-lg text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {choice}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center text-sm text-gray-500 dark:text-gray-400">
                <span>Choose the option that best describes you</span>
                <span>{10 - answers.length} questions remaining</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

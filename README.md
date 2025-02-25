# MBTI Personality Test with AI

An intelligent MBTI personality assessment tool powered by Fireworks AI's large language models. This application demonstrates advanced AI capabilities in personality analysis through dynamic question generation and detailed reasoning.

## Features

- **Dynamic Question Generation**: Uses Llama-v3-70B to generate contextually aware, scenario-based MBTI questions
- **Intelligent Analysis**: Leverages DeepSeek-R1 for comprehensive personality assessment
- **Real-time Reasoning**: Shows the AI's thought process during analysis
- **Structured Output**: Utilizes JSON-mode for reliable, structured responses
- **Progressive Assessment**: 10-question adaptive personality evaluation

## AI Models Used

- **Question Generation**: Fireworks AI's Llama-v3-70B-Instruct
  - Generates subtle, scenario-based questions
  - Adapts questions based on previous responses
  - Structured JSON output for consistent question format

- **Personality Analysis**: Fireworks AI's DeepSeek-R1
  - Real-time analysis with visible reasoning process
  - Structured MBTI type determination
  - Streaming response capabilities

## Key Technical Features

1. **Structured JSON Outputs**
   - Enforced schema validation for question generation
   - Consistent response formatting
   - Type-safe data handling

2. **Real-time Reasoning Display**
   - Stream-based response processing
   - Live display of AI's analytical process
   - Transparent decision-making visualization

3. **Advanced Prompt Engineering**
   - Context-aware question generation
   - Scenario-based personality assessment
   - Adaptive questioning based on previous responses

## Getting Started

### Prerequisites

- Node.js 16.x or later
- A Fireworks AI API key ([Get one here](https://fireworks.ai))
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mbti-ai-test.git
cd mbti-ai-test
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Usage

1. Enter your Fireworks AI API key when prompted (if not set in environment variables)
2. Answer the series of 10 scenario-based questions
3. Watch the AI's real-time analysis process
4. Receive your detailed MBTI personality type result

## Technical Architecture

- **Frontend**: Next.js 13+ with React
- **API Routes**: Next.js API routes for model interaction
- **Streaming**: Server-sent events for real-time analysis display
- **Type Safety**: TypeScript throughout the application

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
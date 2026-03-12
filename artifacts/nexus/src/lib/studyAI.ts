// Study Module AI client - uses dedicated LongCat API key for quiz generation, study chatbot, and feedback
const STUDY_API_URL = 'https://api.longcat.chat/openai/v1/chat/completions';
const STUDY_API_KEY = 'ak_2ZN7Ht5Jl1Q24K584t8oT4pe3pu9b';
const MODEL = 'LongCat-Flash-Chat';

export interface StudyAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function studyAIChat(
  messages: StudyAIMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  const maxRetries = 2;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(STUDY_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${STUDY_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          messages,
          max_tokens: options?.maxTokens ?? 2000,
          temperature: options?.temperature ?? 0.7,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const errText = await res.text().catch(() => 'Unknown error');
        if (attempt < maxRetries && (res.status >= 500 || res.status === 429)) {
          await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
          continue;
        }
        throw new Error(`Study AI error ${res.status}: ${errText}`);
      }

      const data = await res.json();
      return data.choices?.[0]?.message?.content?.trim() ?? 'Could not generate response.';
    } catch (err) {
      if (attempt < maxRetries && (err instanceof DOMException || (err as Error).name === 'AbortError')) {
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }

  throw new Error('Failed after retries');
}

// Quiz generation system prompt
export const QUIZ_SYSTEM_PROMPT = `You are an expert quiz generator for educational purposes. You create high-quality questions based on provided study material content.

CRITICAL RULES:
1. Generate questions ONLY from the provided content/topic. Never make up facts.
2. For MCQ: Provide exactly 4 options (A, B, C, D) with one correct answer.
3. For Fill in the Blanks: Use "___" for the blank. Provide the correct answer.
4. For Matching: Provide pairs to match. Each item has exactly one match.
5. For Short Q/A: Questions answerable in 1-2 words/sentences. Provide correct answer.
6. For Broad Questions: Only provide the question and allocated marks. NO answer.
7. For Creative Questions (NCTB Style): Follow Bangladesh NCTB creative question format:
   - A stimulus/passage (উদ্দীপক)
   - (ক) Knowledge-based question (জ্ঞানমূলক) - 1 mark
   - (খ) Comprehension question (অনুধাবনমূলক) - 2 marks
   - (গ) Application question (প্রয়োগমূলক) - 3 marks
   - (ঘ) Higher-order/analytical question (উচ্চতর দক্ষতামূলক) - 4 marks
   Total per creative question: 10 marks. Only provide questions, NO answers.

RESPONSE FORMAT: You MUST respond with valid JSON only. No markdown, no explanation.

For auto-gradable types (MCQ, Fill in Blanks, Matching, Short Q/A):
{
  "questions": [
    {
      "id": 1,
      "type": "mcq",
      "question": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": "A",
      "marks": 1
    }
  ],
  "totalMarks": 10,
  "totalTime": 600
}

For non-gradable types (Broad, Creative):
{
  "questions": [
    {
      "id": 1,
      "type": "broad",
      "question": "...",
      "marks": 5
    }
  ],
  "totalMarks": 25,
  "totalTime": 0
}

For Creative (NCTB style):
{
  "questions": [
    {
      "id": 1,
      "type": "creative",
      "stimulus": "...",
      "parts": [
        { "label": "ক", "question": "...", "marks": 1 },
        { "label": "খ", "question": "...", "marks": 2 },
        { "label": "গ", "question": "...", "marks": 3 },
        { "label": "ঘ", "question": "...", "marks": 4 }
      ],
      "marks": 10
    }
  ],
  "totalMarks": 10,
  "totalTime": 0
}`;

export const QUIZ_FEEDBACK_PROMPT = `You are a friendly, encouraging exam evaluator. Provide feedback on quiz results.

RULES:
- If score >= 80%: Celebrate genuinely, highlight strengths, suggest minor improvements warmly
- If score 50-79%: Encourage progress, point out what went well, cleverly suggest areas to review without being discouraging
- If score < 50%: Be warm and supportive. Never say "you need improvement" directly. Instead say things like "these topics would be great to revisit" or "a quick review of X will make these click". Frame it as the material being tricky, not the student being weak.
- Always end on a hopeful, motivating note
- Keep it 3-5 sentences max
- Use 1-2 emojis naturally
- Never use words like "poor", "bad", "weak", "failing", "disappointing"`;

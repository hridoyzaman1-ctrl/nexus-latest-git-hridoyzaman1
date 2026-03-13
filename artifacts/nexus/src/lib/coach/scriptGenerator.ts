import type { ScriptSettings } from '@/types/presentationCoach';
import { chatWithLongCat, type LongCatMessage } from '@/lib/longcat';

const LONGCAT_KEY = import.meta.env.VITE_LONGCAT_API_KEY || '';

export function isScriptGenerationAvailable(): boolean {
  return LONGCAT_KEY.length > 0;
}

function estimateWordCount(durationSeconds: number): number {
  return Math.round((durationSeconds / 60) * 140);
}

function buildPrompt(settings: ScriptSettings): string {
  const wordCount = estimateWordCount(settings.duration);
  const durationMin = Math.round(settings.duration / 60);

  let prompt = `Generate a ${durationMin}-minute ${settings.presentationType || 'speech'} script on the topic: "${settings.topic}".

Target length: approximately ${wordCount} words (for ${durationMin} minutes at ~140 WPM).`;

  if (settings.targetAudience) {
    prompt += `\nTarget audience: ${settings.targetAudience}`;
  }
  if (settings.tone) {
    prompt += `\nTone: ${settings.tone}`;
  }
  if (settings.language && settings.language !== 'English') {
    prompt += `\nLanguage: ${settings.language}`;
  }
  if (settings.keyPoints) {
    prompt += `\nKey points to cover: ${settings.keyPoints}`;
  }
  if (settings.speakingStyle) {
    prompt += `\nSpeaking style: ${settings.speakingStyle}`;
  }
  if (settings.purpose) {
    prompt += `\nPurpose: ${settings.purpose}`;
  }
  if (settings.callToAction) {
    prompt += `\nCall to action: ${settings.callToAction}`;
  }
  if (settings.complexityLevel) {
    prompt += `\nComplexity level: ${settings.complexityLevel}`;
  }
  if (settings.customInstructions) {
    prompt += `\nAdditional instructions: ${settings.customInstructions}`;
  }

  prompt += `\n\nStructure the script appropriately for a ${settings.presentationType || 'speech'}:`;

  switch (settings.presentationType?.toLowerCase()) {
    case 'interview answer':
    case 'interview':
      prompt += '\n- Structure as a natural spoken answer, not a formal speech';
      prompt += '\n- Start with a direct response, then provide supporting details and examples';
      break;
    case 'pitch':
    case 'startup pitch':
      prompt += '\n- Include: hook, problem, solution, market, traction, team, ask';
      break;
    case 'debate':
      prompt += '\n- Include: thesis statement, supporting arguments with evidence, anticipation of counterarguments, strong conclusion';
      break;
    default:
      prompt += '\n- Include: engaging introduction, organized main points, clear transitions, memorable conclusion';
  }

  prompt += '\n\nFormat the script as plain text ready to be read aloud. Use [PAUSE] markers for natural breathing points. Do not include stage directions or formatting instructions.';

  return prompt;
}

export async function generateScript(settings: ScriptSettings): Promise<string> {
  if (!isScriptGenerationAvailable()) {
    throw new Error('Script generation is not available. Please add your longcat.chat API key.');
  }

  const systemPrompt = `You are an expert speechwriter and presentation coach. Generate polished, natural-sounding scripts that are ready to be spoken aloud. Match the tone, audience, and purpose precisely. Output ONLY the script text with [PAUSE] markers — no headers, instructions, or meta-text. CRITICAL: Your script MUST end with a complete, properly punctuated sentence. Never cut off mid-sentence, mid-word, or mid-thought. If you are running short on space, finish your current point and add one final concluding sentence before stopping.`;

  const messages: LongCatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: buildPrompt(settings) },
  ];

  const maxTokens = Math.min(4000, Math.max(500, estimateWordCount(settings.duration) * 2));

  return chatWithLongCat(messages, { maxTokens, temperature: 0.7 });
}

export async function generateQuestionFromTopic(topic: string, category: string): Promise<string[]> {
  if (!isScriptGenerationAvailable()) {
    throw new Error('AI question generation requires the longcat.chat API key.');
  }

  const messages: LongCatMessage[] = [
    { role: 'system', content: 'Generate 5 challenging practice questions for the given topic and category. Output ONLY the questions, one per line, numbered 1-5. No other text.' },
    { role: 'user', content: `Topic: ${topic}\nCategory: ${category}` },
  ];

  const response = await chatWithLongCat(messages, { maxTokens: 500, temperature: 0.8 });
  return response.split('\n').filter(l => l.trim()).map(l => l.replace(/^\d+[\.\)]\s*/, '').trim()).filter(Boolean);
}

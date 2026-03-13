import type { ScriptSettings } from '@/types/presentationCoach';
import { chatWithLongCat, type LongCatMessage } from '@/lib/longcat';
import { trimToLastSentence } from '@/lib/contentMediaEngine';

const LONGCAT_KEY = import.meta.env.VITE_LONGCAT_API_KEY || '';

export function isScriptGenerationAvailable(): boolean {
  return LONGCAT_KEY.length > 0;
}

function estimateWordCount(durationSeconds: number): number {
  return Math.round((durationSeconds / 60) * 140);
}

/**
 * Detect non-Latin script languages whose Unicode characters are not in the
 * model's base vocabulary. Each character may consume 3–6 tokens vs 1–2 for
 * English — so we must multiply the token budget accordingly.
 */
function isNonLatinScript(language: string): boolean {
  const lang = language.toLowerCase();
  return (
    lang.includes('bangla')    || lang.includes('bengali')  || lang.includes('বাংলা') ||
    lang.includes('arabic')    || lang.includes('عرب')                                ||
    lang.includes('chinese')   || lang.includes('mandarin') || lang.includes('中')    ||
    lang.includes('japanese')  || lang.includes('日本')                               ||
    lang.includes('korean')    || lang.includes('한국')                               ||
    lang.includes('hindi')     || lang.includes('हिंदी')    || lang.includes('हिन')  ||
    lang.includes('urdu')      || lang.includes('اردو')                               ||
    lang.includes('persian')   || lang.includes('farsi')                              ||
    lang.includes('thai')      || lang.includes('ภาษา')                               ||
    lang.includes('russian')   || lang.includes('русский')                            ||
    lang.includes('ukrainian') || lang.includes('украин')                             ||
    lang.includes('greek')     || lang.includes('ελλην')
  );
}

function isBanglaLanguage(language: string): boolean {
  const lang = language.toLowerCase();
  return lang.includes('bangla') || lang.includes('bengali') || language.includes('বাংলা');
}

function buildPrompt(settings: ScriptSettings): string {
  const wordCount = estimateWordCount(settings.duration);
  const durationMin = Math.round(settings.duration / 60);
  const isBangla = isBanglaLanguage(settings.language || '');
  const nonLatin = isNonLatinScript(settings.language || 'English');

  let prompt = `Generate a ${durationMin}-minute ${settings.presentationType || 'speech'} script on the topic: "${settings.topic}".

Target length: approximately ${wordCount} words (for ${durationMin} minutes at ~140 WPM).`;

  if (settings.targetAudience) {
    prompt += `\nTarget audience: ${settings.targetAudience}`;
  }
  if (settings.tone) {
    prompt += `\nTone: ${settings.tone}`;
  }
  if (settings.language && settings.language !== 'English') {
    if (isBangla) {
      prompt += `\nLanguage: Write the ENTIRE script in Bangla (বাংলা) ONLY. Every single word, sentence, and phrase must be in Bangla script. Do NOT use any English words or Latin characters except for proper nouns with no Bangla equivalent. End every sentence with the Bangla danda (।).`;
    } else if (nonLatin) {
      prompt += `\nLanguage: ${settings.language} — Write the ENTIRE script in ${settings.language} only. Do not mix in English or any other language.`;
    } else {
      prompt += `\nLanguage: ${settings.language}`;
    }
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

  const isBangla  = isBanglaLanguage(settings.language || '');
  const nonLatin  = isNonLatinScript(settings.language || 'English');

  // Bangla and other non-Latin scripts use 4–6 tokens per character in the
  // LLM tokenizer (vs 1–2 for English). We multiply the token budget by 5×
  // so the full speech gets generated instead of cutting off after ~30 words.
  const tokenMultiplier = nonLatin ? 5 : 2;
  const hardCap         = nonLatin ? 8000 : 4000;
  const minTokens       = nonLatin ? 1000 : 500;
  const maxTokens       = Math.min(hardCap, Math.max(minTokens, estimateWordCount(settings.duration) * tokenMultiplier));

  // Sentence-end rule tailored to the script language
  const sentenceEndRule = isBangla
    ? 'The VERY LAST character of your output MUST be the Bangla danda (।). Never end mid-sentence, mid-word, or mid-thought. If you are running out of space, stop adding new points and write one final short concluding sentence ending with ।'
    : 'The VERY LAST character of your output MUST be a period (.), exclamation mark (!), or question mark (?). Never end mid-sentence, mid-word, or mid-thought. If you are running out of space, stop adding new points and write one final short concluding sentence to end gracefully.';

  const banglaReminder = isBangla
    ? '\n\nBANGLA REMINDER: Every single word must be in Bangla script (বাংলা). Do NOT write any English words. End every sentence with ।'
    : '';

  const systemPrompt = `You are an expert speechwriter and presentation coach. Generate polished, natural-sounding scripts that are ready to be spoken aloud. Match the tone, audience, and purpose precisely. Output ONLY the script text with [PAUSE] markers — no headers, instructions, or meta-text.

CRITICAL — COMPLETION RULE: Your script MUST be complete and end at a proper sentence boundary. ${sentenceEndRule} A complete script that ends cleanly is far better than a longer script that is cut off mid-sentence.${banglaReminder}`;

  const messages: LongCatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: buildPrompt(settings) },
  ];

  const raw = await chatWithLongCat(messages, { maxTokens, temperature: 0.7 });

  // Post-process: guarantee the output ends at a proper sentence boundary even
  // if the model still manages to cut off (catches edge cases at the token limit)
  return trimToLastSentence(raw);
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

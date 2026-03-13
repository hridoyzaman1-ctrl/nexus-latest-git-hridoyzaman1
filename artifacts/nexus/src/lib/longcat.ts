// LongCat AI API client (OpenAI-compatible)
//
// KEY POOLS — each feature group has its own primary + fallback key pool.
// Multiple comma-separated keys are supported per variable.
// If the active key hits its quota (401/429) the next key is tried automatically.
//
// VITE_LONGCAT_API_KEY   → General AI: Book Summaries, Analytics, Study Quiz, Wellness
// VITE_KIRA_API_KEY      → Kira chat assistant
// VITE_STUDIO_API_KEY    → Audio Studio + Video Studio narration/scripts (primary)
// VITE_AV_STUDIO_API_KEY → Audio Studio + Video Studio fallback key
// VITE_MEDIA_GEN_API_KEY → Media Generation (Summary/Explainer/Podcast/Video modal) fallback
// VITE_PRESENTATION_API_KEY → Presentation video script generation fallback

const LONGCAT_API_URL = 'https://api.longcat.chat/openai/v1/chat/completions';
const MODEL = 'LongCat-Flash-Chat';

// ── Key pool helpers ──────────────────────────────────────────────────────────

function parseKeyPool(raw: string): string[] {
  return raw.split(',').map(k => k.trim()).filter(Boolean);
}

// Primary pools
const LONGCAT_KEYS      = parseKeyPool(import.meta.env.VITE_LONGCAT_API_KEY      || '');
const KIRA_KEYS         = parseKeyPool(import.meta.env.VITE_KIRA_API_KEY         || '');
const STUDIO_KEYS       = parseKeyPool(import.meta.env.VITE_STUDIO_API_KEY       || '');

// Feature-specific fallback keys (merged into each pool below)
const AV_STUDIO_KEYS    = parseKeyPool(import.meta.env.VITE_AV_STUDIO_API_KEY    || '');
const MEDIA_GEN_KEYS    = parseKeyPool(import.meta.env.VITE_MEDIA_GEN_API_KEY    || '');
const PRESENTATION_KEYS = parseKeyPool(import.meta.env.VITE_PRESENTATION_API_KEY || '');

// Combined pools: primary STUDIO_KEYS first, then feature-specific backup
const AV_POOL           = [...STUDIO_KEYS, ...AV_STUDIO_KEYS];
const MEDIA_GEN_POOL    = [...STUDIO_KEYS, ...MEDIA_GEN_KEYS];
const PRESENTATION_POOL = [...STUDIO_KEYS, ...PRESENTATION_KEYS];

// Per-pool round-robin cursors (persist across calls within a page session)
const poolIndex: Record<string, number> = {
  longcat:      0,
  kira:         0,
  av:           0,
  mediaGen:     0,
  presentation: 0,
};

// Whether a status code means "this key is exhausted / rate-limited"
function isKeyExhausted(status: number): boolean {
  return status === 401 || status === 403 || status === 429;
}

/**
 * Core fetch with multi-key rotation.
 * Starts at the current round-robin cursor and tries every key in the pool.
 * On success: advances the cursor (even load distribution).
 * On 401/403/429: skips immediately to the next key.
 * On 5xx / timeout: one back-off retry before moving on.
 */
async function callWithKeyPool(
  poolName: string,
  keys: string[],
  body: object,
  timeoutMs: number,
  fallbackMsg: string,
): Promise<string> {
  if (keys.length === 0) {
    throw new Error(`No API keys configured for "${poolName}".`);
  }

  const startIdx = poolIndex[poolName] ?? 0;
  let lastError: Error = new Error('All API keys failed');

  for (let ki = 0; ki < keys.length; ki++) {
    const keyIdx = (startIdx + ki) % keys.length;
    const apiKey = keys[keyIdx];

    for (let attempt = 0; attempt <= 1; attempt++) {
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), timeoutMs);

        const res = await fetch(LONGCAT_API_URL, {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:  `Bearer ${apiKey}`,
          },
          body:   JSON.stringify(body),
          signal: controller.signal,
        });
        clearTimeout(tid);

        if (res.ok) {
          poolIndex[poolName] = (keyIdx + 1) % keys.length;
          const data = await res.json();
          return data.choices?.[0]?.message?.content?.trim() ?? fallbackMsg;
        }

        const errText = await res.text().catch(() => 'unknown error');

        if (isKeyExhausted(res.status)) {
          lastError = new Error(`Key ${ki + 1}/${keys.length} exhausted (${res.status}), trying next…`);
          break;
        }
        if (res.status >= 500) {
          if (attempt === 0) { await new Promise(r => setTimeout(r, 600)); continue; }
          lastError = new Error(`${poolName} API error ${res.status}: ${errText}`);
          break;
        }
        throw new Error(`${poolName} API error ${res.status}: ${errText}`);

      } catch (err) {
        const e = err as Error;
        if (e.name === 'AbortError' || e instanceof DOMException) {
          if (attempt === 0) { await new Promise(r => setTimeout(r, 400)); continue; }
          lastError = new Error(`${poolName} key ${ki + 1} timed out, trying next…`);
          break;
        }
        throw err;
      }
    }
  }

  throw lastError;
}

// ── Public API ─────────────────────────────────────────────────────────────────

export interface LongCatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** General AI — Book summaries, Analytics, Study Quiz, Wellness */
export async function chatWithLongCat(
  messages: LongCatMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  return callWithKeyPool('longcat', LONGCAT_KEYS, {
    model: MODEL, messages,
    max_tokens:  options?.maxTokens  ?? 300,
    temperature: options?.temperature ?? 0.7,
  }, 15000, "I couldn't generate a response right now. Please try again.");
}

/** Kira chat assistant */
export async function chatWithKira(
  messages: LongCatMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  return callWithKeyPool('kira', KIRA_KEYS, {
    model: MODEL, messages,
    max_tokens:  options?.maxTokens  ?? 300,
    temperature: options?.temperature ?? 0.7,
  }, 15000, "I couldn't generate a response right now. Please try again.");
}

/** Audio Studio + Video Studio narration and script generation.
 *  Primary pool: VITE_STUDIO_API_KEY  •  Fallback: VITE_AV_STUDIO_API_KEY */
export async function chatWithStudioAI(
  messages: LongCatMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  if (AV_POOL.length === 0) throw new Error('No Studio API keys configured.');
  return callWithKeyPool('av', AV_POOL, {
    model: MODEL, messages,
    max_tokens:  options?.maxTokens  ?? 1200,
    temperature: options?.temperature ?? 0.72,
  }, 30000, '');
}

/** Media Generation modal (Summary / Explainer / Podcast / Video modes).
 *  Primary pool: VITE_STUDIO_API_KEY  •  Fallback: VITE_MEDIA_GEN_API_KEY */
export async function chatWithMediaGenAI(
  messages: LongCatMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  if (MEDIA_GEN_POOL.length === 0) throw new Error('No Media Gen API keys configured.');
  return callWithKeyPool('mediaGen', MEDIA_GEN_POOL, {
    model: MODEL, messages,
    max_tokens:  options?.maxTokens  ?? 1200,
    temperature: options?.temperature ?? 0.72,
  }, 30000, '');
}

/** Presentation video script generation.
 *  Primary pool: VITE_STUDIO_API_KEY  •  Fallback: VITE_PRESENTATION_API_KEY */
export async function chatWithPresentationAI(
  messages: LongCatMessage[],
  options?: { maxTokens?: number; temperature?: number }
): Promise<string> {
  if (PRESENTATION_POOL.length === 0) throw new Error('No Presentation API keys configured.');
  return callWithKeyPool('presentation', PRESENTATION_POOL, {
    model: MODEL, messages,
    max_tokens:  options?.maxTokens  ?? 1200,
    temperature: options?.temperature ?? 0.72,
  }, 30000, '');
}

// ── System prompts ─────────────────────────────────────────────────────────────

export const KIRA_SYSTEM_PROMPT = `You are Kira — an AI friend inside the MindFlow app. You're NOT a therapist, NOT a motivational poster, NOT a customer service bot. You're the friend everyone deserves: real, warm, funny when it fits, and solid when things get heavy.

## Who You Are
- The friend who texts back with something that actually helps, not a wall of platitudes
- You match the user's energy — hyped when they're hyped, calm when they're struggling, goofy when they're just hanging out
- You have opinions (gentle ones) and personality — you're not a blank mirror
- You notice things — if they mentioned stress yesterday and seem better today, you notice that

## How You Talk (CRITICAL — FOLLOW STRICTLY)
- Like a real person texting. Short, natural, conversational.
- **1-2 sentences MAXIMUM for casual messages. 3 sentences ONLY for heavy/serious topics.** This is non-negotiable.
- NEVER write more than 3 sentences. NEVER use bullet points or lists. NEVER write paragraphs.
- If you catch yourself writing more than 3 sentences, DELETE everything after the third.
- Humor is your secret weapon. Light, clever, never mean. Use it to disarm tension, not deflect from real stuff.
- Emojis: 0-1 per message. Like a normal human. Not every sentence needs a 💜.
- NEVER start with "I hear you" or "That sounds like..." — just respond naturally like a friend would
- NEVER say "beautiful soul," "you've got this," "you're enough" or any motivational poster language
- Don't parrot back what they said. React to it.
- Ask questions only when genuinely curious, not as a therapy technique

## When They're Struggling
- Don't rush to fix. Sometimes "yeah, that sucks" is the best thing you can say.
- Validate without being dramatic about it. Their feelings are real, you don't need to amplify them.
- If they have OCD/anxiety: don't feed reassurance loops. Be grounding without being preachy.
- Offer practical stuff casually — "have you tried..." not "I recommend you..."
- NEVER be so heavy/serious that you make them feel worse. You're a warm presence, not a crisis in response to their crisis.

## When They're Happy
- Match their energy! Be genuinely excited. Ask questions. Celebrate with them.
- Don't immediately pivot to advice or wellness. Just enjoy the moment with them.
- Tease them lightly if appropriate — real friends roast each other (gently).

## Boundaries
- Crisis (self-harm, suicide): Always share 988 Lifeline and Crisis Text Line. Be serious but not clinical.
- Don't diagnose. Don't play therapist. Suggest professional help casually when it fits.
- Never help with anything harmful or illegal — redirect firmly but kindly.
- Remember context from the conversation and reference it naturally.

## Productivity
- Help with focus/habits/goals when asked, but weave it in naturally
- Don't turn every conversation into a wellness lecture`;

export const ANALYTICS_SYSTEM_PROMPT = `You are Kira, analyzing the user's MindFlow data. Write a report that feels like a friend reviewing their week — honest, constructive, and specific to THEIR numbers. No generic fluff.

Structure:
1. **The Big Picture** — 2-3 sentences summarizing where they stand. Reference actual numbers.
2. **What's Working** — Specific strengths backed by data (streaks, completion rates, focus time). Celebrate concrete wins.
3. **Where to Level Up** — Honest but kind areas for improvement. Don't sugarcoat, but don't be harsh. Give specific, actionable advice tied to their data.
4. **Sleep & Wellness** — If data exists, analyze patterns. If not, gently suggest tracking.
5. **Study Planner** — If study data exists, analyze it comprehensively:
    - For ACADEMIC STUDENTS (School/University/Class categories): Provide detailed constructive feedback. Include specific study strategies, spaced repetition suggestions, time distribution advice across subjects, exam preparation tips, and recommend balancing heavy/light subjects. Point out if any subject is being neglected. Suggest study techniques like active recall, Pomodoro, or interleaving based on their patterns. If QUIZ DATA exists: analyze quiz performance trends in detail — highlight strong subjects, identify subjects needing more review, compare scores across quiz types, recommend which topics to re-study before next quiz. For students with OCD/anxiety patterns: suggest calming study strategies, remind them that consistent effort matters more than perfection, recommend regular breaks and manageable study chunks, and normalize asking for help.
    - For CASUAL LEARNERS: Keep it casual and encouraging. Just note their progress, celebrate consistency, and maybe suggest a fun study goal. No academic pressure.
    - If NO study data: skip this section entirely, don't mention it.
6. **Quiz Performance** — Only if quiz data exists:
   - Analyze quiz score trends. Are they improving? Which subjects are strong vs weak?
   - Which question types do they perform best/worst on?
   - Suggest specific review strategies based on quiz weaknesses
   - Celebrate improvements, however small
7. **Material Progress** — If material completion data exists, note reading/review progress
8. **Presentation Coach** — Only if coaching data exists:
   - Analyze presentation coaching session scores. Note their strongest/weakest areas (posture, eye contact, gestures, speech delivery, pace, time management).
   - Suggest specific practice strategies based on low-scoring categories.
   - Celebrate improvements and high scores. Note how many sessions they've completed.
   - If they use scripts/teleprompter, note it. If they use question mode, acknowledge their interview/Q&A practice.
   - Encourage regular practice if sessions are sparse.
9. **Nutrition & Diet** — Only if nutrition data exists:
   - Analyze their eating patterns: average daily calories, protein intake, meal distribution
   - Note if they're hitting reasonable calorie targets or skewing too high/low
   - Comment on meal consistency (are they logging breakfast? skipping meals?)
   - Suggest dietary improvements based on macro distribution
   - Skip entirely if no nutrition data
10. **Fitness & Exercise** — Only if fitness data exists:
   - Analyze workout frequency, total exercise time, and calories burned
   - If BMI data is available, comment on their progress toward healthy weight
   - Note exercise consistency and encourage regular movement
   - Suggest workout improvements based on their pattern (more variety, longer sessions, etc.)
   - Skip entirely if no fitness data
11. **Notes & Reading** — If notes or books data exists, briefly mention their note-taking activity and reading progress. Skip if no data.
12. **News Engagement** — Only if news reading data exists:
   - Note their reading patterns — how many articles they've read, which categories they prefer
   - Suggest staying informed but balancing news consumption with productive activities
   - Skip entirely if no news data
13. **Media Generation** — Only if media generation data exists (MEDIA GENERATION DATA section provided):
   - Note how many audio/video items they've created and which modules they're using most
   - If they've created media from study materials, acknowledge it as excellent multi-modal learning
   - If they use Audio Studio or Video Studio, recognize their creative use of the platform
   - Skip entirely if no media data
14. **Weather Context** — If weather data is provided, weave it naturally into wellness or productivity advice (e.g., suggest outdoor walks on nice days, indoor focus on rainy days). Keep it brief — 1 sentence max.
15. **Next Steps** — 3 specific, practical things they can do this week based on their data.

Rules:
- Reference actual numbers from their data, don't make things up
- Keep it under 600 words — dense and useful, not padded
- Tone: smart friend, not corporate report. Conversational but data-driven.
- Use emojis sparingly (2-3 total). No motivational poster language.
- If scores are low, be constructive not discouraging. "Room to grow" not "you're failing."
- If data is sparse, acknowledge it and encourage more tracking without being preachy.
- CRITICAL: Only include Study Planner section if study data is provided. Do NOT generate study advice for users with no study data.
- CRITICAL: Your report MUST end with a complete, properly punctuated sentence. Never cut off mid-sentence or mid-word. If you are nearing the word limit, finish your current point with a clean concluding sentence before stopping.`;

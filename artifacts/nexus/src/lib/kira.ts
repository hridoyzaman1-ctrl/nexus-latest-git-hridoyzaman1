// Kira's personality and responses for the chatbot
// Kira is a chill, real friend — not a therapy bot or motivational poster

const kiraGreetings = [
  "Hey! 👋 I'm Kira. What's going on with you today?",
  "Yo, welcome! I'm Kira — think of me as a friend who actually listens. What's up?",
  "Hey there! I'm Kira. No agenda, no judgment — just here if you want to chat. How's your day?",
  "Hi! I'm Kira 🙂 Tell me what's on your mind, or we can just hang.",
  "Hey! I'm Kira. Good day? Bad day? Weird day? I'm here for all of them.",
];

const kiraStartupMessages = [
  "Hey, welcome back! How's it going?",
  "Oh hey! What's the vibe today?",
  "Good to see you! Anything on your mind?",
  "You're back! How are things?",
  "Hey! Hope your day's been decent. What's up? 🙂",
  "Welcome back! Anything exciting happening?",
  "Hey hey! Doing okay today?",
  "Look who's here 😄 How are we doing?",
  "Back again! That's what I like to see. How's life treating you?",
  "Hey! Take a sec, breathe, and tell me — how's today going?",
  "Good to have you back! ☕ Take a breath, settle in, and let's see what today has in store.",
  "Hey! What's the highlight of your day so far? Even small ones count.",
];

const kiraStartupQuestions = [
  "How are you actually doing today? No filter needed.",
  "What's one thing you're looking forward to?",
  "How's the energy level — charged up or running on fumes?",
  "Anything bugging you that you want to get off your chest?",
  "What's something good that happened recently? 🙂",
  "If today had a soundtrack, what would it be? 🎵",
  "Got any small wins lately? I want to hear about them.",
  "What does a good day look like for you today?",
  "Anyone make you laugh recently? Tell me about it 😄",
  "What's one kind thing you can do for yourself today?",
];

interface KiraResponse {
  patterns: RegExp[];
  responses: string[];
}

const kiraConversations: KiraResponse[] = [
  {
    patterns: [/sad|depressed|down|unhappy|hopeless|crying|tears|miserable/i],
    responses: [
      "That sounds really rough. I'm here — no rush, no pressure. Want to talk about it or just need some company?",
      "I'm sorry you're going through that. You don't have to figure it all out right now. What would feel even a little bit helpful?",
      "That sucks, honestly. You don't need to pretend it doesn't. I'm right here if you want to vent or just sit with it.",
      "Some days are just hard. That's real, and it's okay. What do you need right now?",
      "I hear you. You've gotten through tough days before — but you don't need a pep talk right now, you need someone to just be here. So here I am.",
    ],
  },
  {
    patterns: [/anxious|anxiety|worried|nervous|panic|scared|fear|overwhelmed/i],
    responses: [
      "Okay, let's slow it down for a sec. Deep breath — you're safe right now. What's your brain spiraling about?",
      "Anxiety is such a liar, honestly. Most of the stuff it warns you about never happens. What's it telling you right now?",
      "That restless feeling is the worst. Want to try grounding for a sec? Tell me 3 things you can see right now.",
    ],
  },
  {
    patterns: [/stress|stressed|burnout|exhausted|tired|overwhelm/i],
    responses: [
      "Sounds like you've been carrying a lot. What's one thing on your plate that can honestly wait?",
      "Burnout is your brain's way of saying 'enough.' What if you just did the bare minimum today and gave yourself a break? That's not lazy, that's smart.",
      "You've been pushing hard. What's one small thing that makes you feel human again? Do that today.",
    ],
  },
  {
    patterns: [/lonely|alone|isolated|no friends|nobody cares/i],
    responses: [
      "Loneliness hits different. For what it's worth — I'm glad you're here talking to me. Is there anyone you could text today, even just to say hey?",
      "That feeling is so heavy. But you reaching out right now? That's actually a big deal. What kind of connection would feel good?",
    ],
  },
  {
    patterns: [/happy|great|good|amazing|wonderful|excited|grateful/i],
    responses: [
      "Oh hell yeah! 🎉 What's got you feeling good? I want the details!",
      "Love that energy! Seriously though, what's the highlight? Let's soak it in.",
      "That's awesome! Ride that wave — you earned it. What's making your day?",
    ],
  },
  {
    patterns: [/help|sos|crisis|suicide|hurt myself|self.?harm|kill/i],
    responses: [
      "I'm really glad you said something. That takes guts. Please reach out to the 988 Suicide & Crisis Lifeline (call or text 988) or text HOME to 741741. You matter, and there are people who can help right now. I'm here too.",
      "Thank you for telling me this. Please know — this feeling is temporary even when it doesn't feel like it. 988 Lifeline (call/text 988) or Crisis Text Line (text HOME to 741741). You're not alone in this.",
    ],
  },
  {
    patterns: [/motivat|productive|focus|lazy|procrastinat/i],
    responses: [
      "Pro tip: don't wait to feel motivated. Just start with the dumbest, smallest step. Like literally 2 minutes. Momentum does the rest. What's the task?",
      "Procrastination usually means something feels too big or unclear. What if you broke it into the tiniest possible piece? What's step one?",
      "Here's the thing — 'lazy' is usually just exhausted or overwhelmed in disguise. What's actually blocking you?",
    ],
  },
  {
    patterns: [/sleep|insomnia|can.?t sleep|nightmare/i],
    responses: [
      "Sleep issues are the worst. Have you tried the boring basics? No screens 30 min before bed, cool room, and maybe some deep breathing? Simple but it actually works.",
      "That's frustrating. Your brain probably won't shut up, right? Try writing down whatever's in your head before bed — kind of like emptying the trash folder. Helps more than you'd think.",
    ],
  },
  {
    patterns: [/ocd|compuls|intrusive|ritual|obsess/i],
    responses: [
      "Those intrusive thoughts are NOT you. They're just brain noise — annoying, scary brain noise, but noise. You're way more than what your OCD tries to tell you.",
      "OCD is exhausting. One thing that actually helps: try delaying the compulsion by even a few minutes. Each time you do, you're teaching your brain who's boss. You've got this.",
    ],
  },
  {
    patterns: [/thank|thanks|appreciate/i],
    responses: [
      "Anytime! That's literally what I'm here for 🙂",
      "No need to thank me — I like talking to you! Keep doing your thing.",
    ],
  },
  {
    patterns: [/who are you|what are you|your name|kira/i],
    responses: [
      "I'm Kira! Think of me as that friend in your pocket who actually listens, doesn't judge, and occasionally has decent advice 😄 I'm here for the good, the bad, and the random.",
    ],
  },
  {
    patterns: [/morning|good morning|wake up|woke up/i],
    responses: [
      "Morning! ☀️ What's the plan today — conquer the world or just survive it? Both are valid.",
      "Good morning! Hope you slept okay. What's on the agenda?",
    ],
  },
  {
    patterns: [/night|good night|bedtime|going to sleep/i],
    responses: [
      "Night! Sleep well — you did good today, even if it doesn't feel like it. See you tomorrow 🌙",
      "Goodnight! Rest up. Tomorrow's got potential and so do you.",
    ],
  },
];

// Fallback responses when no pattern matches
const kiraFallbacks = [
  "Tell me more about that — I'm listening.",
  "Interesting. How's that sitting with you?",
  "Got it. What else is on your mind?",
  "I hear you. Is there something specific you're trying to figure out?",
  "Sometimes just getting it out of your head helps. Keep going if you want.",
  "No agenda here — just talk. I'm all ears 🙂",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getKiraGreeting(): string {
  return pickRandom(kiraGreetings);
}

export function getKiraStartupMessage(): string {
  return pickRandom(kiraStartupMessages);
}

export function getKiraStartupQuestion(): string {
  return pickRandom(kiraStartupQuestions);
}

export function getKiraResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();
  
  for (const conv of kiraConversations) {
    for (const pattern of conv.patterns) {
      if (pattern.test(lower)) {
        return pickRandom(conv.responses);
      }
    }
  }
  
  return pickRandom(kiraFallbacks);
}

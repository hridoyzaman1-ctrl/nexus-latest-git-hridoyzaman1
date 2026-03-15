export interface TooltipStep {
  /** CSS selector or data-tour attribute to highlight */
  target: string;
  /** Title shown in tooltip */
  title: string;
  /** Description shown below title */
  description: string;
  /** Preferred tooltip placement relative to the target */
  placement?: 'top' | 'bottom' | 'left' | 'right';
}

export interface PageTooltips {
  pageId: string;
  steps: TooltipStep[];
}

export const pageTooltipConfigs: Record<string, TooltipStep[]> = {
  dashboard: [
    { target: '[data-tour="greeting"]', title: 'Welcome to MindFlow 🌟', description: "We've pre-loaded some demo data (tasks, habits, etc.) so you can see the app in action right away! You can clear this anytime in Settings.", placement: 'bottom' },
    { target: '[data-tour="greeting"]', title: 'Your Dashboard 👋', description: 'This is your daily command center. See your progress, streaks, and quick actions at a glance.', placement: 'bottom' },
    { target: '[data-tour="daily-progress"]', title: 'Daily Progress', description: 'Track how many tasks, habits, and goals you\'ve completed today.', placement: 'bottom' },
    { target: '[data-tour="quick-modules"]', title: 'Quick Access', description: 'Tap any module card to jump right in. Drag to rearrange or tap the pencil to customize!', placement: 'top' },
    { target: '[data-tour="quote"]', title: 'Daily Quote ✨', description: 'A fresh quote every day to keep you inspired. Tap to copy it!', placement: 'bottom' },
  ],
  goals: [
    { target: '[data-tour="goals-header"]', title: 'Your Goals 🎯', description: 'Set meaningful goals and break them into milestones to track progress.', placement: 'bottom' },
    { target: '[data-tour="add-btn"]', title: 'Create a Goal', description: 'Tap here to add a new goal with milestones, categories, and deadlines.', placement: 'left' },
  ],
  habits: [
    { target: '[data-tour="habits-header"]', title: 'Habit Tracker 🔥', description: 'Build daily habits and watch your streaks grow. Consistency is key!', placement: 'bottom' },
    { target: '[data-tour="add-btn"]', title: 'Add a Habit', description: 'Create habits you want to build. Check them off daily to earn XP and level up!', placement: 'left' },
    { target: '[data-tour="view-tabs"]', title: 'Different Views', description: 'Switch between Quests, Heatmap, Badges, and the Rewards Shop.', placement: 'bottom' },
  ],
  tasks: [
    { target: '[data-tour="tasks-header"]', title: 'Task Manager ✅', description: 'Organize tasks with priorities, due dates, subtasks, and reminder alarms.', placement: 'bottom' },
    { target: '[data-tour="add-btn"]', title: 'Add a Task', description: 'Create tasks with priority levels — from Low to Urgent. Set reminders to get alerted.', placement: 'left' },
  ],
  focus: [
    { target: '[data-tour="focus-header"]', title: 'Focus Timer ⏱️', description: 'Use the Pomodoro technique — work in focused sessions with breaks. Ambient sounds and a visualizer keep you in the zone.', placement: 'bottom' },
    { target: '[data-tour="timer-display"]', title: 'Timer Controls', description: 'Start, pause, or reset your timer. Customize session durations in settings.', placement: 'bottom' },
  ],
  notes: [
    { target: '[data-tour="notes-header"]', title: 'Notes 📝', description: 'Capture thoughts with markdown formatting. Organize in folders, add tags, and view your knowledge graph.', placement: 'bottom' },
    { target: '[data-tour="add-btn"]', title: 'New Note', description: 'Tap to create a quick note. Use version history to restore previous saves.', placement: 'left' },
    { target: '[data-tour="media-generate-btn"]', title: 'Generate Audio/Video 🎧', description: 'Tap the headphones icon on any note to generate a narrated audio summary or slideshow video from your note content.', placement: 'left' },
  ],
  books: [
    { target: '[data-tour="books-header"]', title: 'Library 📚', description: 'Read books directly in the app. Swipe to turn pages. We\'ve included 9 books to get you started!', placement: 'bottom' },
    { target: '[data-tour="ai-summarizer"]', title: 'AI Summary & Explainer ✨', description: 'Use AI to summarize or explain any book. Choose Quick Summary, Deep Dive, or ELI5 mode!', placement: 'bottom' },
    { target: '[data-tour="saved-notes"]', title: 'Your Saved Notes & Summaries 📋', description: 'All your saved notes and AI summaries for each book, accessible right here.', placement: 'bottom' },
    { target: '[data-tour="media-generate-btn"]', title: 'Generate Audio/Video 🎧', description: 'Tap the headphones icon on any book to create a narrated audio summary or animated slideshow video — saved to your Media Library.', placement: 'left' },
  ],
  todos: [
    { target: '[data-tour="todos-header"]', title: 'Quick To-Do 📋', description: 'A lightweight checklist for quick tasks. Type and hit enter. Set reminders with custom alarms!', placement: 'bottom' },
  ],
  expenses: [
    { target: '[data-tour="expenses-header"]', title: 'Expense Tracker 💰', description: 'Track spending with budgets, donut charts, category limits, 6-month trends, and downloadable reports.', placement: 'bottom' },
    { target: '[data-tour="add-btn"]', title: 'Log Expense', description: 'Record expenses with amount and category. Set per-category budget limits to get alerts when approaching limits.', placement: 'left' },
  ],
  'audio-studio': [
    { target: '[data-tour="audio-studio-header"]', title: 'Audio Studio 🎧', description: 'Create narrated audio content from any text, PDF, or topic description. Powered entirely by your device — no uploads, no subscriptions.', placement: 'bottom' },
    { target: '[data-tour="audio-studio-input-tabs"]', title: 'Three Ways to Add Content', description: 'Upload a file, paste text directly, or use Describe mode to tell Kira what you want and she\'ll write the full script for you!', placement: 'bottom' },
    { target: '[data-tour="audio-studio-describe"]', title: 'AI Script Generation ✨', description: 'Type a description like "A 5-minute intro to machine learning for beginners" and tap Generate Script — Kira writes the complete script for you.', placement: 'bottom' },
    { target: '[data-tour="audio-studio-generate"]', title: 'Generate Audio', description: 'Choose your format (Summary, Explainer, or Video) and your content is generated instantly using your device\'s speech engine.', placement: 'top' },
  ],
  'video-studio': [
    { target: '[data-tour="video-studio-header"]', title: 'Video Studio 🎬', description: 'Turn any text or idea into an animated slideshow video. Rendered frame by frame using Canvas API — 100% offline and private.', placement: 'bottom' },
    { target: '[data-tour="video-studio-input-tabs"]', title: 'Three Ways to Add Content', description: 'Upload a PDF/TXT file, paste your content, or use Describe mode. Kira structures your input into a scene-by-scene video script!', placement: 'bottom' },
    { target: '[data-tour="video-studio-describe"]', title: 'AI Video Script ✨', description: 'Describe your video (e.g., "An explainer about climate change for teens") and Kira writes a structured, visual scene script optimized for slideshow format.', placement: 'bottom' },
    { target: '[data-tour="video-studio-generate"]', title: 'Generate Your Video', description: 'Tap to launch the media generator. Select Video mode and your content becomes a downloadable WebM video file saved to Media Library.', placement: 'top' },
  ],
  'media-library': [
    { target: '[data-tour="media-library-header"]', title: 'Media Library 🎵', description: 'All your generated audio summaries, explainers, and slideshow videos — in one place. Organized by source module.', placement: 'bottom' },
    { target: '[data-tour="media-library-filters"]', title: 'Filter by Source', description: 'Tap All, Books, Notes, Study, Presentations, Audio Studio, or Video Studio to see media from that specific module.', placement: 'bottom' },
    { target: '[data-tour="media-library-player"]', title: 'Built-in Player 🎧', description: 'Tap any item to expand its player. Audio plays inline; video slideshows play frame by frame. Both can be downloaded as WebM files.', placement: 'bottom' },
  ],
  study: [
    { target: '[data-tour="study-header"]', title: 'Study Planner LMS 🎓', description: 'A full learning management system — import PDFs, slides, videos, take split-screen notes, highlight text, use study timers, quizzes, and your AI Study Buddy.', placement: 'bottom' },
    { target: '[data-tour="study-stats"]', title: 'Study Dashboard 📊', description: 'Tap to view your total study time, material completion rates, and 14-day trends.', placement: 'bottom' },
    { target: '[data-tour="study-timer"]', title: 'Session Timer ⏱️', description: 'Start a focus timer for this study session. It runs as a mini stopwatch so you can study anywhere in the app!', placement: 'left' },
    { target: '[data-tour="study-quiz-btn"]', title: 'Generate Quiz 🧠', description: 'Turn your study materials into AI-powered quizzes to test your knowledge!', placement: 'left' },
    { target: '[data-tour="ai-summarizer"]', title: 'AI Summary & Explainer ✨', description: 'Generate AI summaries or simplified explanations of your study materials. Choose Quick Summary, Deep Dive, or ELI5 mode!', placement: 'bottom' },
    { target: '[data-tour="saved-notes"]', title: 'Your Saved Notes & Summaries 📋', description: 'View, download, or delete all your saved notes and AI-generated summaries for each document.', placement: 'bottom' },
    { target: '[data-tour="study-buddy-fab"]', title: 'Kira Study Buddy ✨', description: 'Tap here for AI homework help! Ask any question, attach screenshots of problems, and get step-by-step solutions.', placement: 'left' },
    { target: '[data-tour="study-presentations"]', title: 'Presentation Maker 🎨', description: 'Create AI-powered presentations from your study materials! Generate slides from topics or uploaded documents and link them to study sessions.', placement: 'bottom' },
  ],
  'study-reader': [
    { target: '[data-tour="reader-rotate"]', title: 'Auto-Rotate 📱', description: 'Tap to rotate the entire reader horizontally for wider viewing on mobile.', placement: 'bottom' },
    { target: '[data-tour="reader-ai"]', title: 'AI Assistant ✨', description: 'Generate summaries or get concepts explained instantly while you read.', placement: 'bottom' },
    { target: '[data-tour="reader-notes"]', title: 'Split-Screen Notes 📝', description: 'Take notes side-by-side with your document. Notes auto-save every 10 seconds!', placement: 'bottom' },
    { target: '[data-tour="study-buddy-fab"]', title: 'Contextual AI Help 🤖', description: 'Open Kira here and she’ll already know what material and page you are looking at!', placement: 'left' },
  ],
  'study-video': [
    { target: '[data-tour="reader-rotate"]', title: 'Rotate Video 📱', description: 'Watch lectures in landscape mode — the entire interface rotates with the video.', placement: 'bottom' },
    { target: '[data-tour="reader-notes"]', title: 'Video Notes 📝', description: 'Take timestamped notes while watching. Perfect for online lectures!', placement: 'bottom' },
  ],
  'study-quiz-result': [
    { target: '[data-tour="quiz-score"]', title: 'Quiz Results 🎯', description: 'See your final score and time taken. This feeds into your overall Academic Analytics.', placement: 'bottom' },
    { target: '[data-tour="quiz-feedback"]', title: 'AI Context 🧠', description: 'Review the correct answers along with AI-generated explanations of why they are right.', placement: 'top' },
  ],
  'books-reader': [
    { target: '[data-tour="reader-rotate"]', title: 'Auto-Rotate 📱', description: 'Tap to rotate the book horizontally for wider viewing on mobile.', placement: 'bottom' },
    { target: '[data-tour="reader-ai"]', title: 'AI Assistant ✨', description: 'Generate summaries, deep dives, or ELI5 explanations for any book.', placement: 'bottom' },
    { target: '[data-tour="reader-notes"]', title: 'In-App Notes 📝', description: 'Take notes directly alongside your book. Access them later in the Saved Notes section.', placement: 'bottom' },
    { target: '[data-tour="reader-bookmark"]', title: 'Bookmarks 🔖', description: 'Save your current page to quickly return later. Access bookmarks from the list view.', placement: 'top' },
  ],
  'time-tracking': [
    { target: '[data-tour="time-header"]', title: 'Time Tracking ⏰', description: 'Log how you spend your time. See daily and weekly breakdowns.', placement: 'bottom' },
  ],
  wellness: [
    { target: '[data-tour="wellness-header"]', title: 'Wellness Hub 💚', description: 'Track your mood, meditate, log sleep & water, and access OCD support tools. The grounding button is always available!', placement: 'bottom' },
  ],
  reminders: [
    { target: '[data-tour="reminders-header"]', title: 'Reminders 🔔', description: 'Set one-time or recurring reminders with custom alarm sounds so you never miss anything important.', placement: 'bottom' },
  ],
  analytics: [
    { target: '[data-tour="analytics-header"]', title: 'Analytics 📊', description: 'Productivity, wellness, and study trends with charts, subject breakdowns, quiz performance, and AI-powered academic reports.', placement: 'bottom' },
  ],
  chat: [
    { target: '[data-tour="chat-header"]', title: 'Kira Wellness Chat 🌟', description: 'Your personal wellness buddy — chat about your day, get motivation, or vent. Use quick prompts to get started!', placement: 'bottom' },
  ],
  settings: [
    { target: '[data-tour="settings-header"]', title: 'Settings ⚙️', description: 'Customize your profile, theme, accent colors, notifications, accessibility, audio, data backup, and more.', placement: 'bottom' },
  ],
  emergency: [
    { target: '[data-tour="emergency-header"]', title: 'Emergency Contacts 🛡️', description: 'Add up to 5 trusted contacts. Enable Safety Protocol in Settings to alert them on extended inactivity.', placement: 'bottom' },
  ],
  'presentation-coach': [
    { target: '[data-tour="coach-header"]', title: 'Presentation Coach 🎤', description: 'Practice your presentations with AI-powered real-time coaching. Get scored across 7 categories with live feedback!', placement: 'bottom' },
    { target: '[data-tour="coach-setup"]', title: 'Session Setup', description: 'Configure your coaching session — choose presentation type, duration, and difficulty level before you begin.', placement: 'bottom' },
    { target: '[data-tour="coach-camera"]', title: 'Camera & Microphone 📹', description: 'Enable your camera and mic for full analysis. The AI evaluates your body language, eye contact, filler words, and vocal delivery.', placement: 'bottom' },
    { target: '[data-tour="coach-live"]', title: 'Live Coaching 🔴', description: 'During your session, receive real-time feedback on pacing, clarity, confidence, and engagement as you speak.', placement: 'bottom' },
    { target: '[data-tour="coach-scoring"]', title: 'Scoring Dashboard 📊', description: 'View your scores across 7 categories: Clarity, Confidence, Pacing, Eye Contact, Body Language, Filler Words, and Engagement.', placement: 'bottom' },
    { target: '[data-tour="coach-script"]', title: 'Script Generator 📝', description: 'Generate a presentation script from your topic. Use it as a reference or load it into the teleprompter.', placement: 'bottom' },
    { target: '[data-tour="coach-teleprompter"]', title: 'Teleprompter 📜', description: 'Read your script from the built-in teleprompter while practicing. Adjust scroll speed to match your pace.', placement: 'bottom' },
    { target: '[data-tour="coach-questions"]', title: 'Q&A Mode ❓', description: 'Practice handling audience questions. The AI generates relevant questions based on your presentation topic.', placement: 'bottom' },
    { target: '[data-tour="coach-reports"]', title: 'Session Reports 📋', description: 'Review detailed reports after each session with improvement suggestions and progress tracking over time.', placement: 'bottom' },
    { target: '[data-tour="coach-history"]', title: 'Session History 📁', description: 'Access all your past coaching sessions, compare scores, and track your improvement journey.', placement: 'bottom' },
  ],
  'presentation-generator': [
    { target: '[data-tour="generator-header"]', title: 'Presentation Maker 🎨', description: 'Create beautiful AI-powered presentations in seconds. Generate from a topic, upload a PDF, or paste text!', placement: 'bottom' },
    { target: '[data-tour="generator-create"]', title: 'Create Presentation ➕', description: 'Start a new presentation from a topic, uploaded PDF/DOCX, or pasted text. The AI structures your content into slides.', placement: 'bottom' },
    { target: '[data-tour="generator-ai"]', title: 'AI Generation ✨', description: 'The AI analyzes your input and generates a complete slide deck with titles, bullet points, and speaker notes.', placement: 'bottom' },
    { target: '[data-tour="generator-editor"]', title: 'Slide Editor ✏️', description: 'Edit any slide content directly. Add, remove, or reorder slides to perfect your presentation.', placement: 'bottom' },
    { target: '[data-tour="generator-themes"]', title: 'Themes 🎭', description: 'Choose from multiple professional themes to style your presentation. Preview changes in real-time.', placement: 'bottom' },
    { target: '[data-tour="generator-export"]', title: 'Export PPTX 📥', description: 'Download your finished presentation as a PowerPoint file ready to present anywhere.', placement: 'bottom' },
    { target: '[data-tour="generator-notes"]', title: 'Speaker Notes 🗒️', description: 'Each slide includes AI-generated speaker notes to help guide your delivery during the actual presentation.', placement: 'bottom' },
    { target: '[data-tour="generator-create-video"]', title: 'Create Video from Presentation 🎬', description: 'Tap the purple film icon on any presentation to open the Video Studio creator. Pick a mode (Video, Summary, or Explainer), choose English or বাংলা, preview the AI script, then generate a full animated video with smooth slide transitions — saved directly to Video Studio!', placement: 'left' },
    { target: '[data-tour="viewer-record-btn"]', title: 'Record Your Own Narration 🎙️', description: 'Tap "Record" when viewing any presentation to open the split-screen Narration Recorder — slides on top, teleprompter with your speaker notes below. Record your voice as you present!', placement: 'bottom' },
    { target: '[data-tour="generator-create-video"]', title: 'Generate Video with Your Voice 🎤', description: 'After recording your narration, open the Video Creator and switch Narration Source to "My Voice". Tap "Generate with My Voice" to produce a video that uses your real recorded audio — perfectly timed to each slide!', placement: 'left' },
  ],
  'pres-record-player': [
    { target: '[data-tour="record-header"]', title: 'Narration Recorder 🎙️', description: 'This is your split-screen recording studio. Your slides appear on top, and your speaker notes scroll below as a teleprompter. Navigate slides while speaking — the app tracks every second!', placement: 'bottom' },
    { target: '[data-tour="record-btn"]', title: 'Start Recording 🔴', description: 'Tap "Record" to begin. Your microphone captures your voice and a live red timer shows how long you\'ve been going. Navigate slides naturally — the app captures exactly when each slide was shown.', placement: 'bottom' },
    { target: '[data-tour="record-teleprompter-tab"]', title: 'Teleprompter Tab 📜', description: 'Your speaker notes for every slide scroll here as you present. The current slide\'s notes are highlighted in violet. Use Auto-scroll so the text moves automatically while you speak!', placement: 'top' },
    { target: '[data-tour="record-autoscroll"]', title: 'Auto-Scroll Speed ⚡', description: 'Toggle Auto to scroll your speaker notes automatically. Drag the slider to set the scrolling speed — slow for complex content, fast for confident speakers.', placement: 'top' },
    { target: '[data-tour="record-timing-tab"]', title: 'Slide Timing Tab ⏱️', description: 'Prefer to set exact durations instead of recording? Switch to Slide Timing and enter how many seconds each slide should appear in the generated video. Tap Save when done.', placement: 'top' },
    { target: '[data-tour="record-slide-nav"]', title: 'Navigate Slides While Recording 🖱️', description: 'Tap the left/right arrows or swipe to move between slides at your own pace while recording. Every slide change is time-stamped so the video cuts at exactly the right moment.', placement: 'bottom' },
  ],
  nutrition: [
    { target: '[data-tour="nutrition-header"]', title: 'Nutrition Planner 🍽️', description: 'Track your meals, plan diets, browse recipes, and generate nutrition reports — all in one place.', placement: 'bottom' },
    { target: '[data-tour="nutrition-log"]', title: 'Food Logging 📝', description: 'Search 210+ foods and log what you eat. See calories, protein, carbs, fat, and fiber for each item.', placement: 'bottom' },
    { target: '[data-tour="nutrition-recipes"]', title: 'Recipe Suggestions 👨‍🍳', description: 'Browse 65+ recipes from multiple cuisines. Match recipes to ingredients you have on hand.', placement: 'bottom' },
    { target: '[data-tour="nutrition-planner"]', title: 'Meal Planner 📅', description: 'Generate daily, weekly, or monthly meal plans based on your cuisine preference and calorie goals.', placement: 'bottom' },
    { target: '[data-tour="nutrition-reports"]', title: 'Nutrition Reports 📊', description: 'Generate reports with health scores, macro breakdowns, insights, and recommendations.', placement: 'bottom' },
  ],
  fitness: [
    { target: '[data-tour="fitness-header"]', title: 'Body & Fitness 💪', description: 'Track your BMI, generate workout routines, browse exercises, and use the workout timer — all free, all local.', placement: 'bottom' },
    { target: '[data-tour="fitness-profile"]', title: 'Your Profile 📋', description: 'Enter your weight, height, age, and gender to calculate BMI and get personalized workout recommendations.', placement: 'bottom' },
    { target: '[data-tour="fitness-planner"]', title: 'Workout Planner 📅', description: 'Generate weekly, monthly, or custom workout routines based on your fitness goals and BMI.', placement: 'bottom' },
    { target: '[data-tour="fitness-timer"]', title: 'Exercise Timer ⏱️', description: 'Use the countdown timer or stopwatch during workouts. Get motivational coach messages as you exercise.', placement: 'bottom' },
    { target: '[data-tour="fitness-library"]', title: 'Exercise Library 📚', description: 'Browse 50+ exercises with step-by-step instructions and pose illustrations for each movement.', placement: 'bottom' },
  ],
  news: [
    { target: '[data-tour="news-header"]', title: 'News Portal 📰', description: 'Read the latest headlines from top international and Bangladeshi news sources — all free, powered by RSS feeds.', placement: 'bottom' },
    { target: '[data-tour="news-mode"]', title: 'International & National 🌐', description: 'Switch between international news from BBC, CNN, Reuters, and Bangladeshi news from Daily Star, Prothom Alo, and more.', placement: 'bottom' },
    { target: '[data-tour="news-categories"]', title: 'Categories 📂', description: 'Filter news by category: Top, World, Politics, Business, Technology, Sports, Entertainment, and Health.', placement: 'bottom' },
  ],
  weather: [
    { target: '[data-tour="weather-header"]', title: 'Weather Module 🌤️', description: 'Check current conditions, forecasts, and get smart weather-based advice for your day.', placement: 'bottom' },
    { target: '[data-tour="weather-current"]', title: 'Current Weather 🌡️', description: 'See the current temperature, conditions, humidity, wind speed, and more for your location.', placement: 'bottom' },
    { target: '[data-tour="weather-forecast"]', title: 'Forecasts 📅', description: 'View hourly, daily, and 7-day forecasts to plan ahead. Includes precipitation chances and temperature ranges.', placement: 'bottom' },
    { target: '[data-tour="weather-search"]', title: 'Location Search 🔍', description: 'Search for any city or location worldwide to check its weather conditions and forecasts.', placement: 'bottom' },
    { target: '[data-tour="weather-units"]', title: 'Temperature Units 🔄', description: 'Toggle between Celsius and Fahrenheit to display temperatures in your preferred unit.', placement: 'top' },
  ],
};

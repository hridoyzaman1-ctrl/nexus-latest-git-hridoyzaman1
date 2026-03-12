import type { PracticeQuestion, QuestionCategory } from '@/types/presentationCoach';

function q(category: QuestionCategory, question: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium', thinkingTime = 15): PracticeQuestion {
  return { id: crypto.randomUUID(), category, question, difficulty, thinkingTimeSuggested: thinkingTime };
}

const bank: PracticeQuestion[] = [
  q('interview', 'Tell me about yourself and what makes you a good fit for this role.', 'easy', 10),
  q('interview', 'What is your greatest strength and how has it helped you professionally?', 'easy', 10),
  q('interview', 'Describe a challenging situation at work and how you handled it.', 'medium'),
  q('interview', 'Where do you see yourself in five years?', 'easy', 10),
  q('interview', 'Why are you leaving your current position?', 'medium'),
  q('interview', 'Tell me about a time you failed and what you learned from it.', 'medium'),
  q('interview', 'How do you handle conflict with a coworker or manager?', 'medium'),
  q('interview', 'What motivates you to do your best work?', 'easy', 10),
  q('interview', 'Describe your leadership style with a specific example.', 'hard', 20),
  q('interview', 'How do you prioritize when you have multiple urgent deadlines?', 'medium'),

  q('academic-viva', 'Explain the main thesis of your research and why it matters.', 'medium'),
  q('academic-viva', 'What methodology did you use and why was it appropriate?', 'medium'),
  q('academic-viva', 'How does your work build upon or differ from existing literature?', 'hard', 20),
  q('academic-viva', 'What were the limitations of your study?', 'medium'),
  q('academic-viva', 'If you could redo your research, what would you change?', 'medium'),
  q('academic-viva', 'Explain a key concept from your field to someone outside your discipline.', 'hard', 20),
  q('academic-viva', 'What are the practical implications of your findings?', 'medium'),
  q('academic-viva', 'How did you ensure the validity and reliability of your results?', 'hard', 20),
  q('academic-viva', 'What future research directions do you recommend?', 'medium'),
  q('academic-viva', 'Defend a controversial claim from your work.', 'hard', 25),

  q('debate', 'Present your strongest argument for your position in under two minutes.', 'medium'),
  q('debate', 'How would you respond to the opposing side\'s strongest point?', 'hard', 20),
  q('debate', 'Provide evidence to support your claim.', 'medium'),
  q('debate', 'Why should the audience agree with your position?', 'medium'),
  q('debate', 'Summarize the key differences between your position and the opposition.', 'medium'),
  q('debate', 'Address a potential weakness in your argument.', 'hard', 20),
  q('debate', 'Give a closing statement that summarizes your key points.', 'medium'),
  q('debate', 'How does your position benefit the broader community?', 'medium'),

  q('corporate-qa', 'How does this project align with the company\'s strategic goals?', 'medium'),
  q('corporate-qa', 'What are the key risks and how will you mitigate them?', 'hard', 20),
  q('corporate-qa', 'Can you walk us through the budget breakdown?', 'medium'),
  q('corporate-qa', 'What metrics will you use to measure success?', 'medium'),
  q('corporate-qa', 'How does this compare to competitor solutions?', 'medium'),
  q('corporate-qa', 'What is the timeline for implementation?', 'easy', 10),
  q('corporate-qa', 'How will this impact current team workflows?', 'medium'),
  q('corporate-qa', 'What stakeholder feedback have you incorporated?', 'medium'),

  q('public-speaking-qa', 'What inspired you to speak about this topic?', 'easy', 10),
  q('public-speaking-qa', 'How can the audience apply your message in their daily lives?', 'medium'),
  q('public-speaking-qa', 'Can you share a personal story related to your topic?', 'medium'),
  q('public-speaking-qa', 'What is the single most important takeaway from your talk?', 'easy', 10),
  q('public-speaking-qa', 'How do you respond to critics who disagree with your viewpoint?', 'hard', 20),
  q('public-speaking-qa', 'What research supports the claims you made?', 'medium'),
  q('public-speaking-qa', 'How has your perspective on this topic evolved over time?', 'medium'),
  q('public-speaking-qa', 'What advice would you give to someone just starting in this area?', 'easy', 10),

  q('startup-pitch-qa', 'What problem are you solving and how big is the market?', 'medium'),
  q('startup-pitch-qa', 'What is your business model and path to profitability?', 'medium'),
  q('startup-pitch-qa', 'Who are your main competitors and what is your advantage?', 'medium'),
  q('startup-pitch-qa', 'What traction or milestones have you achieved so far?', 'medium'),
  q('startup-pitch-qa', 'How will you use the investment you are seeking?', 'medium'),
  q('startup-pitch-qa', 'What is your customer acquisition strategy?', 'medium'),
  q('startup-pitch-qa', 'Tell me about your team and why you are the right people for this.', 'medium'),
  q('startup-pitch-qa', 'What happens if your primary strategy does not work?', 'hard', 20),

  q('panel-discussion', 'What is your unique perspective on today\'s topic?', 'easy', 10),
  q('panel-discussion', 'How do you respond to a fellow panelist\'s point you disagree with?', 'hard', 20),
  q('panel-discussion', 'What trends do you see shaping this industry in the next five years?', 'medium'),
  q('panel-discussion', 'How can organizations better address this challenge?', 'medium'),
  q('panel-discussion', 'Share a lesson learned from your experience in this field.', 'medium'),
  q('panel-discussion', 'What is the most common misconception about this topic?', 'medium'),
  q('panel-discussion', 'How do you balance competing priorities in your work?', 'medium'),
  q('panel-discussion', 'What would you recommend to newcomers in this space?', 'easy', 10),

  q('press-media', 'Can you summarize the key announcement in one sentence?', 'easy', 10),
  q('press-media', 'How do you respond to recent criticism of your organization?', 'hard', 20),
  q('press-media', 'What is the timeline for the changes you mentioned?', 'easy', 10),
  q('press-media', 'How will this affect your customers or stakeholders?', 'medium'),
  q('press-media', 'Can you address the rumors circulating about your company?', 'hard', 20),
  q('press-media', 'What data supports the claims you have made?', 'medium'),
  q('press-media', 'How does this compare to what your competitors are doing?', 'medium'),
  q('press-media', 'What is your personal take on this development?', 'medium'),

  q('leadership', 'Describe your approach to building high-performing teams.', 'medium'),
  q('leadership', 'How do you handle underperforming team members?', 'hard', 20),
  q('leadership', 'What is the most difficult decision you have had to make as a leader?', 'hard', 20),
  q('leadership', 'How do you foster innovation within your team?', 'medium'),
  q('leadership', 'Describe a time you had to lead through significant change.', 'medium'),
  q('leadership', 'How do you balance short-term results with long-term vision?', 'medium'),
  q('leadership', 'What is your communication style with your team?', 'easy', 10),
  q('leadership', 'How do you develop future leaders within your organization?', 'medium'),

  q('custom', 'Introduce yourself and your background in two minutes.', 'easy', 10),
  q('custom', 'Present a topic of your choice for practice.', 'medium'),
  q('custom', 'Explain a complex idea in simple terms.', 'medium'),
  q('custom', 'Persuade the audience to take a specific action.', 'medium'),
  q('custom', 'Tell a compelling story related to your field.', 'medium'),
  q('custom', 'Respond to an unexpected question with composure.', 'hard', 20),
  q('custom', 'Give a one-minute elevator pitch about something you are passionate about.', 'easy', 10),
  q('custom', 'Summarize a recent project or achievement.', 'easy', 10),
];

export function getQuestionsByCategory(category: QuestionCategory): PracticeQuestion[] {
  return bank.filter(q => q.category === category);
}

export function getRandomQuestions(category: QuestionCategory, count: number): PracticeQuestion[] {
  const categoryQuestions = [...getQuestionsByCategory(category)];
  const shuffled = categoryQuestions.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function getAllCategories(): QuestionCategory[] {
  return [...new Set(bank.map(q => q.category))];
}

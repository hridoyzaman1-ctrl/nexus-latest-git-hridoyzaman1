export type CoachMoment = 'start_workout' | 'mid_workout' | 'exercise_complete' | 'set_complete' | 'workout_complete' | 'rest_day' | 'streak' | 'comeback' | 'tough_love' | 'timer_halfway' | 'timer_almost_done' | 'skipped';

const COACH_MESSAGES: Record<CoachMoment, string[]> = {
  start_workout: [
    "Let's GO! Your body won't transform itself. Time to WORK!",
    "No excuses today. You showed up — now DOMINATE this workout!",
    "Champions don't hit snooze. You're already ahead of 90% of people!",
    "Pain is temporary. Quitting lasts forever. Let's CRUSH it!",
    "Your future self will THANK you for this. Now MOVE!",
    "Stop thinking, start sweating. The warm-up is NOW!",
    "Every rep counts. Every second matters. Let's make this one COUNT!",
    "You didn't come this far to only come this far. LET'S GO!",
  ],
  mid_workout: [
    "Don't you DARE slow down! Push through — that's where growth happens!",
    "Feel that burn? That's your weakness LEAVING your body!",
    "Halfway there! The easy part is OVER. Time to dig DEEP!",
    "Your muscles are screaming? GOOD. That means they're growing!",
    "Is it hard? OF COURSE it's hard! That's why it WORKS!",
    "The person you want to become is on the other side of this set!",
    "Breathe. Focus. EXECUTE. You're a MACHINE!",
    "Nobody said it would be easy. They said it would be WORTH IT!",
  ],
  exercise_complete: [
    "BOOM! Exercise CRUSHED! On to the next one!",
    "That's what I'm talking about! Keep that energy UP!",
    "One down, but we're NOT done! Stay focused!",
    "Solid work! Now catch your breath and get READY for more!",
    "Exercise DONE! You're building a stronger version of yourself!",
    "EXCELLENT execution! Your form is getting BETTER every time!",
  ],
  set_complete: [
    "Set DONE! Rest up, you've earned 30 seconds. Then we GO AGAIN!",
    "Good set! Shake it out, breathe deep, then ATTACK the next one!",
    "That's the way! One more set closer to your GOAL!",
    "Quick rest — don't get too comfortable! Next set is COMING!",
  ],
  workout_complete: [
    "WORKOUT COMPLETE! You are an absolute BEAST! Be proud of yourself!",
    "That's a WRAP! You just outworked yesterday's version of yourself!",
    "INCREDIBLE session! Your body is going to thank you for this!",
    "Done and DUSTED! Recovery starts NOW — hydrate and refuel!",
    "You showed up, you put in the WORK, you CONQUERED! See you next time!",
    "Another workout in the BOOKS! You're building an unstoppable machine!",
    "FINISHED! That's the discipline of a CHAMPION right there!",
    "Session COMPLETE! Remember — consistency beats intensity. You're on TRACK!",
  ],
  rest_day: [
    "Rest day — your muscles GROW when you recover. Eat well, sleep well!",
    "Active recovery today. Light stretching, walk, stay moving but don't overdo it!",
    "Your body is REBUILDING today. Respect the process, fuel up properly!",
    "Rest doesn't mean lazy. Hydrate, stretch, prepare for tomorrow's WAR!",
    "Even warriors rest. Tomorrow we come back STRONGER!",
  ],
  streak: [
    "STREAK DAY! You're on FIRE! Don't break the chain!",
    "Look at you being CONSISTENT! That's how legends are MADE!",
    "Day after day, you keep showing up. That's CHAMPION mentality!",
    "Your streak is proof that you're SERIOUS about change!",
    "UNSTOPPABLE! Keep this streak alive and watch the transformation!",
  ],
  comeback: [
    "Welcome BACK! Missed you, but what matters is you're HERE now!",
    "Took a break? No judgment. What matters is you came BACK!",
    "The best time was yesterday. The second best time is RIGHT NOW!",
    "You're back in the game! Let's ease into it and build back UP!",
    "Comeback stories are the BEST stories. Let's write yours!",
  ],
  tough_love: [
    "Are you really going to skip today? Your GOALS don't take days off!",
    "Comfortable? GOOD. Now get UNCOMFORTABLE — that's where growth lives!",
    "Stop making excuses and start making PROGRESS!",
    "Your body can handle it. It's your MIND you need to convince!",
    "Nobody is coming to save you. YOU have to save YOURSELF!",
    "Discipline is doing it when you DON'T feel like it!",
    "The only bad workout is the one you DIDN'T do!",
  ],
  timer_halfway: [
    "HALFWAY! Don't quit now — the best part is COMING!",
    "Half done! Your body wants to stop but your WILL is stronger!",
    "50% complete — now finish what you STARTED!",
  ],
  timer_almost_done: [
    "Almost there! DIG DEEP for the final push!",
    "LAST few seconds! Give it EVERYTHING you've got!",
    "The finish line is RIGHT THERE! PUSH THROUGH!",
    "Final stretch! Make these last seconds COUNT!",
  ],
  skipped: [
    "You skipped that one? Alright, but we're going HARDER next time!",
    "Swapped out? Fine. But no more shortcuts today!",
    "That's okay — know your limits but don't let comfort become a habit!",
  ],
};

export function getCoachMessage(moment: CoachMoment): string {
  const messages = COACH_MESSAGES[moment];
  return messages[Math.floor(Math.random() * messages.length)];
}

export function getCoachMessageForStreak(days: number): string {
  if (days >= 30) return `${days} DAYS! You are in LEGENDARY territory! Nothing can stop you!`;
  if (days >= 14) return `${days} days strong! Two weeks of PURE dedication! Keep it rolling!`;
  if (days >= 7) return `A FULL WEEK! 7 days of showing up like a BOSS! Keep going!`;
  if (days >= 3) return `${days} days in a row! You're building MOMENTUM! Don't stop now!`;
  return getCoachMessage('streak');
}

export function getCoachMessageForBMI(bmiCategory: string): string {
  switch (bmiCategory) {
    case 'underweight':
      return "Let's focus on building STRENGTH and healthy mass. You've got this — eat well, train smart!";
    case 'normal':
      return "Great BMI! Let's MAINTAIN this and push your fitness to the NEXT LEVEL!";
    case 'overweight':
      return "We've got work to do! But every journey starts with step ONE — and you're TAKING it!";
    case 'obese':
      return "This is YOUR moment to change everything. Start slow, stay consistent, and watch the TRANSFORMATION!";
    default:
      return "Let's get you in the BEST shape of your life! No excuses, just RESULTS!";
  }
}

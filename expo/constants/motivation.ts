export const TOUGH_LOVE_QUOTES = [
  "Stop making excuses. Start making progress.",
  "Your comfort zone is your enemy. Break free.",
  "Discipline is choosing between what you want now and what you want most.",
  "The grind never stops. Neither should you.",
  "Weak people revenge. Strong people forgive. Intelligent people ignore.",
  "You don't get what you wish for. You get what you work for.",
  "Champions train. Losers complain.",
  "The pain you feel today will be the strength you feel tomorrow.",
  "Success isn't given. It's earned in the gym, on the field, in every quiet moment when you choose to push harder.",
  "Your only limit is you. Stop limiting yourself.",
  "Greatness is not a destination. It's a way of being.",
  "The strongest people are forged in fires of adversity.",
  "Don't wait for opportunity. Create it.",
  "Excellence is not a skill. It's an attitude.",
  "The grind is the glory."
];

export const DATA_DRIVEN_QUOTES = [
  "Progress is measured in consistent daily actions.",
  "Small improvements compound into extraordinary results.",
  "Track your metrics. Optimize your performance.",
  "Data doesn't lie. Your excuses do.",
  "Consistency beats perfection every time.",
  "What gets measured gets managed.",
  "Your habits determine your trajectory.",
  "Focus on leading indicators, not lagging ones.",
  "Systems create success. Goals create direction.",
  "Incremental progress leads to exponential results."
];

export const MORNING_PUSH_MESSAGES = {
  'tough-love': [
    "Time to get up and dominate. The world won't wait for you.",
    "Your competition is already working. What's your excuse?",
    "Champions are made in the morning. Prove you're one.",
    "Stop hitting snooze on your dreams. Get up and grind.",
    "The day starts now. Make it count or make excuses."
  ],
  'data-driven': [
    "Morning routine activated. Time to execute your plan.",
    "Your success rate increases by 73% when you start before 7 AM.",
    "Consistency checkpoint: Day {streakDays} of your journey.",
    "Morning momentum builds daily discipline. Start strong.",
    "Your future self is counting on what you do right now."
  ]
};

export const NOON_PUSH_MESSAGES = {
  'tough-love': [
    "Halfway through the day. Are you winning or making excuses?",
    "The afternoon slump is for the weak. Push through.",
    "Your goals don't care about your mood. Keep grinding.",
    "Champions don't take breaks from excellence.",
    "The grind doesn't pause for lunch. Neither should you."
  ],
  'data-driven': [
    "Midday performance check: {completedTasks}/{totalTasks} tasks completed.",
    "Afternoon productivity typically drops 23%. Beat the statistics.",
    "Energy management is key. Fuel your focus, maintain momentum.",
    "Your completion rate determines your success rate.",
    "Consistent afternoon execution separates winners from wishers."
  ]
};

export const NIGHT_PUSH_MESSAGES = {
  'tough-love': [
    "Did you earn your rest today? Or did you just exist?",
    "Tomorrow's success is built on today's effort. Did you build?",
    "The day is done. But the grind never stops.",
    "Sleep is earned through sweat and effort. Did you earn it?",
    "Champions review their wins and losses. What did you learn?"
  ],
  'data-driven': [
    "Daily review: {xpEarned} XP earned, {tasksCompleted} tasks completed.",
    "Reflection drives improvement. What worked? What didn't?",
    "Tomorrow's plan starts with today's analysis.",
    "Your evening routine sets up tomorrow's success.",
    "Progress tracking: You're {progressPercentage}% closer to your goal."
  ]
};

export function getRandomMotivationalQuote(tone: 'tough-love' | 'data-driven'): string {
  const quotes = tone === 'tough-love' ? TOUGH_LOVE_QUOTES : DATA_DRIVEN_QUOTES;
  return quotes[Math.floor(Math.random() * quotes.length)];
}

export function getTimedPushMessage(
  time: 'morning' | 'noon' | 'night', 
  tone: 'tough-love' | 'data-driven',
  context?: {
    streakDays?: number;
    completedTasks?: number;
    totalTasks?: number;
    xpEarned?: number;
    tasksCompleted?: number;
    progressPercentage?: number;
  }
): string {
  const messages = time === 'morning' 
    ? MORNING_PUSH_MESSAGES[tone]
    : time === 'noon'
    ? NOON_PUSH_MESSAGES[tone]
    : NIGHT_PUSH_MESSAGES[tone];
    
  let message = messages[Math.floor(Math.random() * messages.length)];
  
  // Replace placeholders with actual data
  if (context) {
    message = message
      .replace('{streakDays}', context.streakDays?.toString() || '0')
      .replace('{completedTasks}', context.completedTasks?.toString() || '0')
      .replace('{totalTasks}', context.totalTasks?.toString() || '0')
      .replace('{xpEarned}', context.xpEarned?.toString() || '0')
      .replace('{tasksCompleted}', context.tasksCompleted?.toString() || '0')
      .replace('{progressPercentage}', context.progressPercentage?.toString() || '0');
  }
  
  return message;
}
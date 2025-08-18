export function buildPlannerPrompt(
  goal: { title: string; description: string; deadlineISO: string },
  user: { id: string; experience_level?: string },
  timezone: number,
  agendaTime: string,
  now: Date
): string {
  const deadline = new Date(goal.deadlineISO);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  
  const daysToDeadline = Math.max(1, Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  
  const isLateToday = now.getHours() >= parseInt(agendaTime.split(':')[0]);
  
  return `You are Hustle Planner, an expert goal achievement system. Your job is to create a complete, feasible daily plan from today through the deadline.

# THINKING PROCESS (Follow this exact sequence):

## 1. Understand the Mission
- Goal: "${goal.title}"
- Description: "${goal.description}"
- Days to deadline: ${daysToDeadline} days
- User experience: ${user.experience_level || 'beginner'}
- Late creation today: ${isLateToday}

Detect domain (fitness/endurance/learning/business/productivity/other) and parse outcome/constraints.

## 2. Estimate Feasibility Envelope
- Daily time budget: 60-120 minutes (adjust by domain)
- If late today (${isLateToday}), cap today to 0-1 light item
- Account for user experience level

## 3. Phase the Journey
Split into phases with dependencies:
- Setup/prereqs → fundamentals → progressive work → periodic checks → capstone/taper

Domain heuristics:
- Fitness: progressive overload, weekly benchmarks, taper last 2-4 days
- Learning: spaced repetition, mini-projects, weekly assessments
- Business: daily outreach/maker blocks, weekly reviews, milestone deliverables

## 4. Choose Non-negotiable Streaks (1-3)
Ask: "Which small daily inputs compound fastest for this goal?"
- Keep each streak load 1-2 to leave room for today-tasks
- proof_mode='realtime' only if fresh evidence required (workout pic, practice clip, weigh-in)
- Otherwise proof_mode='flex'

## 5. Create Backlog of Specific Today-Tasks
- Concrete, measurable actions with units/targets (no vague verbs)
- Mark occasional repeats where sensible (weekly assessments, long runs)
- Add prerequisites (buy equipment before practice requiring it)

## 6. Schedule Across Days
For each day from today → deadline:
- Start with streak load → remaining_load = 5 - streak_load
- Place up to 3 today-tasks without exceeding daily load ≤ 5
- Respect dependencies; push overflow forward
- Include 1 deload/light day per week for intensive goals (streaks only)
- If late creation today, keep 0-1 light item
- Never assign after deadline

## 7. Proof Audit & Dedupe
- Decide proof_mode (realtime vs flex) by necessity
- No duplicate titles on same date
- Never repeat one-time purchases

## 8. Final Pass Sanity
- Every date in range present (some days may be streak-only)
- Total per day respects caps
- No tasks after deadline
- Specificity/metrics included

# OUTPUT REQUIREMENTS:

Return ONLY valid JSON in this exact format:

{
  "streak_habits": [
    { "title": "string", "desc": "string", "load": 1, "proof_mode": "realtime|flex" }
  ],
  "daily_plan": [
    {
      "date": "YYYY-MM-DD",
      "today_tasks": [
        { "title": "string", "desc": "string", "load": 1, "proof_mode": "realtime|flex" }
      ]
    }
  ]
}

RULES:
- streak_habits: 1-3 items, each load 1-2
- daily_plan: one entry for EVERY date from ${today.toISOString().split('T')[0]} to ${deadlineDate.toISOString().split('T')[0]}
- Each day: today_tasks length 0-3, daily load ≤ 5 including streaks
- All titles must be specific and actionable
- No duplicate titles on same date
- No tasks after deadline

Generate the complete plan now:`;
}

export function buildFallbackPlan(
  goal: { title: string; description: string; deadlineISO: string },
  daysToDeadline: number
): any {
  const today = new Date();
  const deadline = new Date(goal.deadlineISO);
  
  // Generate date range
  const dates: string[] = [];
  for (let i = 0; i < daysToDeadline; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    dates.push(date.toISOString().split('T')[0]);
  }
  
  // Determine domain-specific streaks
  const title = goal.title.toLowerCase();
  const description = goal.description.toLowerCase();
  
  let streaks: any[] = [];
  let todayTasksTemplate: any[] = [];
  
  if (title.includes('fitness') || title.includes('workout') || title.includes('exercise')) {
    streaks = [
      { title: "Daily Movement", desc: "Complete 20-30 minutes of physical activity", load: 2, proof_mode: "flex" },
      { title: "Progress Check", desc: "Log workout details and how you feel", load: 1, proof_mode: "flex" }
    ];
    todayTasksTemplate = [
      { title: "Plan Tomorrow's Workout", desc: "Decide on specific exercises and duration", load: 1, proof_mode: "flex" },
      { title: "Prepare Equipment", desc: "Set out workout clothes and any needed gear", load: 1, proof_mode: "flex" }
    ];
  } else if (title.includes('learn') || title.includes('study') || title.includes('skill')) {
    streaks = [
      { title: "Daily Practice", desc: "Spend 30 minutes on focused learning", load: 2, proof_mode: "flex" },
      { title: "Review Notes", desc: "Review and organize what you learned today", load: 1, proof_mode: "flex" }
    ];
    todayTasksTemplate = [
      { title: "Identify Learning Resources", desc: "Find books, courses, or materials needed", load: 1, proof_mode: "flex" },
      { title: "Set Learning Goals", desc: "Define what to accomplish this week", load: 1, proof_mode: "flex" }
    ];
  } else {
    // Generic goal
    streaks = [
      { title: "Daily Progress", desc: "Work on goal for 30 minutes minimum", load: 2, proof_mode: "flex" },
      { title: "Reflect & Plan", desc: "Review progress and plan next steps", load: 1, proof_mode: "flex" }
    ];
    todayTasksTemplate = [
      { title: "Break Down Goal", desc: "Identify specific steps needed to achieve goal", load: 1, proof_mode: "flex" },
      { title: "Gather Resources", desc: "Collect tools, information, or materials needed", load: 1, proof_mode: "flex" }
    ];
  }
  
  // Create daily plan with phased approach
  const dailyPlan = dates.map((date, index) => {
    const dayNumber = index + 1;
    const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;
    const isLastWeek = dayNumber > daysToDeadline - 7;
    
    let todayTasks: any[] = [];
    
    // Phase 1: Setup (first 3 days)
    if (dayNumber <= 3) {
      todayTasks = todayTasksTemplate.slice(0, Math.min(2, 5 - streaks.reduce((sum, s) => sum + s.load, 0)));
    }
    // Phase 2: Regular work (middle days)
    else if (!isLastWeek) {
      if (dayNumber % 7 === 0) {
        // Weekly review
        todayTasks = [{ title: "Weekly Review", desc: "Assess progress and adjust plan if needed", load: 1, proof_mode: "flex" }];
      } else if (!isWeekend) {
        todayTasks = [{ title: "Focus Work", desc: "Dedicated work session on main goal activities", load: 2, proof_mode: "flex" }];
      }
    }
    // Phase 3: Final push (last week)
    else {
      if (dayNumber === daysToDeadline) {
        todayTasks = [{ title: "Final Review", desc: "Complete final preparations and review", load: 1, proof_mode: "flex" }];
      } else {
        todayTasks = [{ title: "Final Sprint", desc: "Intensive work on completing goal", load: 2, proof_mode: "flex" }];
      }
    }
    
    return {
      date,
      today_tasks: todayTasks
    };
  });
  
  return {
    streak_habits: streaks,
    daily_plan: dailyPlan
  };
}

// Legacy exports for backward compatibility
export const PLANNER_SYSTEM_PROMPT = `You are an expert goal achievement planner. Your job is to create comprehensive, actionable plans that help users achieve their ultimate goals.`;

export const PLANNER_USER_PROMPT = (
  title: string,
  description: string,
  deadline: string,
  experienceLevel: string,
  timezoneOffset: number
) => `Create a comprehensive plan for this goal:

GOAL: ${title}
DESCRIPTION: ${description}
DEADLINE: ${deadline}
EXPERIENCE LEVEL: ${experienceLevel}
TIMEZONE OFFSET: ${timezoneOffset}

Generate a complete plan from today until the deadline with:
1. 1-3 daily streak habits (low load 1-2)
2. Specific today-tasks distributed across dates
3. Never exceed 3 today-tasks per day
4. Never exceed total daily load of 5
5. Include every date from today to deadline

Return the plan as JSON matching the required schema.`;
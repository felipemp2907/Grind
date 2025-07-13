import { AIMessage, GoalBreakdown } from '@/types';
import { MotivationTone } from '@/store/userStore';

// String similarity for deduplication
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\b(the|a|an|and|or|but|in|on|at|to|for|of|with|by)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isDuplicateTask(title1: string, title2: string): boolean {
  const norm1 = normalizeTitle(title1);
  const norm2 = normalizeTitle(title2);
  
  if (norm1 === norm2) return true;
  
  const distance = levenshteinDistance(norm1, norm2);
  const maxLength = Math.max(norm1.length, norm2.length);
  const similarity = 1 - (distance / maxLength);
  
  return similarity > 0.8; // 80% similarity threshold
}

function hasPhotoKeywords(title: string): boolean {
  const keywords = [
    'gym', 'workout', 'exercise', 'meal', 'food', 'code', 'screen',
    'selfie', 'photo', 'picture', 'progress', 'before', 'after',
    'weight', 'measurement', 'result', 'completion'
  ];
  
  const lowerTitle = title.toLowerCase();
  return keywords.some(keyword => lowerTitle.includes(keyword));
}

interface GoalContext {
  outcome: string;
  unit: string;
  milestones: string[];
  dailyMinutes: number;
  proofPrefs: 'photo' | 'audio' | 'either';
  constraints: string;
}

interface TaskCandidate {
  title: string;
  description: string;
  isHabit: boolean;
  xpValue: number;
  loadScore: number;
  proofMode: 'realtime' | 'flex';
}

interface FilteredTaskResult {
  tasks: TaskCandidate[];
  rejected: Array<{ title: string; reason: string }>;
}

function postProcessTasks(
  tasks: TaskCandidate[], 
  context: GoalContext
): FilteredTaskResult {
  const rejected: Array<{ title: string; reason: string }> = [];
  let filteredTasks = [...tasks];
  
  // 1. Cap Today Tasks and load score
  const todayTasks = filteredTasks.filter(t => !t.isHabit);
  if (todayTasks.length > 3) {
    const excess = todayTasks.slice(3);
    excess.forEach(task => {
      rejected.push({ title: task.title, reason: 'Exceeded max 3 today tasks' });
    });
    filteredTasks = filteredTasks.filter(t => t.isHabit || todayTasks.slice(0, 3).includes(t));
  }
  
  // Check total load score
  const totalLoad = filteredTasks.filter(t => !t.isHabit).reduce((sum, t) => sum + t.loadScore, 0);
  if (totalLoad > 5) {
    // Remove lowest priority tasks until load <= 5
    const sortedTasks = filteredTasks.filter(t => !t.isHabit).sort((a, b) => b.xpValue - a.xpValue);
    let currentLoad = 0;
    const keptTasks = [];
    
    for (const task of sortedTasks) {
      if (currentLoad + task.loadScore <= 5) {
        keptTasks.push(task);
        currentLoad += task.loadScore;
      } else {
        rejected.push({ title: task.title, reason: 'Exceeded daily load budget' });
      }
    }
    
    filteredTasks = [...filteredTasks.filter(t => t.isHabit), ...keptTasks];
  }
  
  // 2. Deduplicate
  const uniqueTasks: TaskCandidate[] = [];
  for (const task of filteredTasks) {
    const isDupe = uniqueTasks.some(existing => isDuplicateTask(task.title, existing.title));
    if (isDupe) {
      rejected.push({ title: task.title, reason: 'Duplicate task detected' });
    } else {
      uniqueTasks.push(task);
    }
  }
  filteredTasks = uniqueTasks;
  
  // 3. Proof mode sanity
  filteredTasks = filteredTasks.map(task => {
    let proofMode = task.proofMode;
    
    if (hasPhotoKeywords(task.title) || context.proofPrefs === 'photo') {
      proofMode = 'realtime';
    }
    
    return { ...task, proofMode };
  });
  
  // 4. Streak vs Today guard
  filteredTasks.forEach(task => {
    if (task.isHabit) {
      const rotatingKeywords = ['day', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      const hasRotatingKeyword = rotatingKeywords.some(keyword => 
        task.title.toLowerCase().includes(keyword)
      );
      
      if (hasRotatingKeyword) {
        rejected.push({ title: task.title, reason: 'Rotating phrase not suitable for streak habit' });
        task.isHabit = false; // Convert to regular task
      }
    }
  });
  
  return { tasks: filteredTasks, rejected };
}

// Function to clean AI response to ensure valid JSON
const cleanJsonResponse = (response: string): string => {
  // Remove markdown code block syntax if present
  let cleaned = response.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
  
  // Remove any other markdown formatting that might be present
  cleaned = cleaned.replace(/```/g, '');
  
  // Trim whitespace
  cleaned = cleaned.trim();
  
  // Ensure the response starts with [ or { for valid JSON
  if (!cleaned.startsWith('[') && !cleaned.startsWith('{')) {
    // If we can find a JSON array or object within the text, extract it
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    
    if (arrayMatch) {
      cleaned = arrayMatch[0];
    } else if (objectMatch) {
      cleaned = objectMatch[0];
    } else {
      // If we can't find valid JSON, return a fallback
      return '[]';
    }
  }
  
  return cleaned;
};

// Function to call the AI API
export const callAI = async (messages: AIMessage[]): Promise<string> => {
  try {
    const response = await fetch('https://toolkit.rork.com/text/llm/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    return data.completion;
  } catch (error) {
    console.error('Error calling AI:', error);
    throw error;
  }
};

// AI Goal Breakdown - Core feature for Grind
export const generateGoalBreakdown = async (
  goalTitle: string,
  goalDescription: string,
  deadline: string,
  targetValue: number,
  unit: string = '',
  currentProgress: number = 0
): Promise<GoalBreakdown> => {
  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are Hustle, the AI coach for Grind. Your job is to break down ambitious goals into actionable daily tasks and streak habits.

Goal Analysis:
- Title: ${goalTitle}
- Description: ${goalDescription}
- Deadline: ${deadline}
- Target: ${targetValue} ${unit}
- Current Progress: ${currentProgress} ${unit}

Create a comprehensive breakdown with:
1. TODAY TASKS: 3-5 specific, actionable one-time tasks for today
2. STREAK HABITS: 2-3 daily habits that build toward the goal
3. MILESTONES: 4-5 progress checkpoints (25%, 50%, 75%, 100%)
4. MOTIVATION: Inspiring message about achieving this goal
5. TIME ESTIMATE: Realistic timeline for completion

Make tasks:
- Specific and measurable
- Appropriate difficulty (not overwhelming)
- Varied in approach (research, practice, planning, execution)
- Photo/proof-friendly when possible

Respond with JSON:
{
  "todayTasks": [
    {
      "title": "Clear, actionable task name",
      "description": "Detailed instructions",
      "xpValue": 30-60,
      "estimatedTime": "30 min",
      "priority": "high|medium|low"
    }
  ],
  "streakHabits": [
    {
      "title": "Daily habit name",
      "description": "What to do daily",
      "xpValue": 20-40,
      "frequency": "daily"
    }
  ],
  "milestones": [
    {
      "title": "Milestone name",
      "description": "What this achievement means",
      "progressThreshold": 25,
      "dueDate": "YYYY-MM-DD (optional)"
    }
  ],
  "motivation": "Inspiring message about this goal",
  "estimatedTimeToComplete": "X weeks/months"
}

IMPORTANT: Return ONLY the JSON object without markdown formatting.`
    },
    {
      role: 'user',
      content: `Please break down my goal: "${goalTitle}" into actionable tasks and habits. I want to ${goalDescription} by ${deadline}.`
    }
  ];

  try {
    const response = await callAI(messages);
    const cleanedResponse = cleanJsonResponse(response);
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('Error generating goal breakdown:', error);
    
    // Fallback breakdown
    return {
      todayTasks: [
        {
          title: `Research strategies for ${goalTitle}`,
          description: `Spend 30 minutes researching proven methods and strategies for achieving: ${goalDescription}`,
          xpValue: 40,
          estimatedTime: '30 min',
          priority: 'high' as const
        },
        {
          title: `Create action plan for ${goalTitle}`,
          description: 'Write down specific steps and timeline for your goal',
          xpValue: 50,
          estimatedTime: '45 min',
          priority: 'high' as const
        },
        {
          title: `Take first concrete step toward ${goalTitle}`,
          description: 'Complete one small but meaningful action today',
          xpValue: 60,
          estimatedTime: '60 min',
          priority: 'medium' as const
        }
      ],
      streakHabits: [
        {
          title: `Daily progress on ${goalTitle}`,
          description: 'Spend at least 15 minutes working toward your goal',
          xpValue: 30,
          frequency: 'daily' as const
        },
        {
          title: 'Goal reflection',
          description: 'Review progress and plan next steps',
          xpValue: 20,
          frequency: 'daily' as const
        }
      ],
      milestones: [
        {
          title: '25% Progress',
          description: 'First quarter of your goal completed',
          progressThreshold: 25
        },
        {
          title: '50% Progress',
          description: 'Halfway to your goal!',
          progressThreshold: 50
        },
        {
          title: '75% Progress',
          description: 'Three quarters complete - almost there!',
          progressThreshold: 75
        },
        {
          title: 'Goal Achieved!',
          description: 'You did it! Goal 100% complete!',
          progressThreshold: 100
        }
      ],
      motivation: `You have everything it takes to achieve ${goalTitle}. Every small step counts, and consistency will get you there!`,
      estimatedTimeToComplete: 'Based on your deadline and current progress'
    };
  }
};

// Parse natural language commands for task/event creation
export const parseTaskCommand = async (userInput: string, currentDate: string): Promise<{
  action: 'create' | 'update' | 'reschedule' | 'none';
  taskData?: {
    title: string;
    description?: string;
    date: string;
    time?: string;
    isHabit?: boolean;
    xpValue?: number;
  };
  updateData?: {
    taskId?: string;
    newDate?: string;
    newTime?: string;
  };
  confirmation: string;
}> => {
  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are a task command parser for Hustle. Analyze user input and determine if they want to create, update, or reschedule a task.

Current date: ${currentDate}

Parse the user input and respond with a JSON object containing:
{
  "action": "create" | "update" | "reschedule" | "none",
  "taskData": {
    "title": "extracted task title",
    "description": "optional description",
    "date": "YYYY-MM-DD format",
    "time": "HH:MM format if specified",
    "isHabit": boolean (true if it's a recurring/daily task),
    "xpValue": number (20-50 based on complexity)
  },
  "updateData": {
    "taskId": "if updating existing task",
    "newDate": "YYYY-MM-DD if rescheduling",
    "newTime": "HH:MM if changing time"
  },
  "confirmation": "Natural language confirmation of what will be done"
}

Examples:
- "Schedule gym workout tomorrow at 7 AM" → create action
- "Move my meeting to Friday" → reschedule action  
- "Add daily meditation" → create action with isHabit: true
- "How's my progress?" → none action
- "Create a task to research competitors" → create action
- "Set up a 30-minute study session for tonight" → create action
- "Add reading as a daily habit" → create action with isHabit: true
- "Schedule a call with John next Tuesday at 2 PM" → create action

Date parsing rules:
- "today" = current date
- "tomorrow" = current date + 1 day
- "tonight" = current date with evening time
- "next week" = current date + 7 days
- "Monday", "Tuesday", etc. = next occurrence of that day
- "next Monday" = the Monday after next

Time parsing rules:
- "7 AM", "7:00 AM", "07:00" → "07:00"
- "2 PM", "2:00 PM", "14:00" → "14:00"
- "tonight" → "20:00"
- "morning" → "09:00"
- "afternoon" → "14:00"
- "evening" → "18:00"

Task type detection:
- Words like "daily", "every day", "habit", "routine" → isHabit: true
- Specific one-time activities → isHabit: false

XP Value assignment:
- Simple tasks (5-15 min): 20-25 XP
- Medium tasks (30-60 min): 30-40 XP  
- Complex tasks (1+ hours): 45-50 XP

IMPORTANT: Return ONLY the JSON object without markdown formatting.`
    },
    {
      role: 'user',
      content: userInput
    }
  ];

  try {
    const response = await callAI(messages);
    const cleanedResponse = cleanJsonResponse(response);
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('Error parsing task command:', error);
    return {
      action: 'none',
      confirmation: "I couldn't understand that command. Try something like 'Schedule workout tomorrow at 8 AM' or 'Add daily meditation as a habit'."
    };
  }
};

// Generate daily agenda with 3 high-impact tasks
export const generateDailyAgenda = async (
  goalTitle: string,
  goalDescription: string,
  recentTasks: string[],
  currentDate: string,
  preferredTone: MotivationTone
): Promise<{
  tasks: Array<{
    title: string;
    description: string;
    xpValue: number;
    priority: 'high' | 'medium' | 'low';
    estimatedTime: string;
  }>;
  motivation: string;
}> => {
  const toneInstructions = {

    'data-driven': 'Focus on metrics, progress tracking, and logical reasoning',
    'tough-love': 'Be direct, challenging, and push for accountability'
  };

  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are Hustle, creating a focused daily agenda. Generate exactly 3 high-impact tasks for today that will meaningfully advance the user's goal.

Goal: ${goalTitle}
Description: ${goalDescription}
Date: ${currentDate}
Recent tasks: ${recentTasks.join(', ')}

Tone: ${toneInstructions[preferredTone]}

Create tasks that are:
- Specific and actionable
- Varied in approach (don't repeat similar tasks)
- Realistic for one day
- Progressively building toward the goal

Respond with JSON:
{
  "tasks": [
    {
      "title": "Clear, specific task name",
      "description": "Detailed instructions",
      "xpValue": 30-60,
      "priority": "high|medium|low",
      "estimatedTime": "30 min"
    }
  ],
  "motivation": "Brief motivational message matching the tone"
}

IMPORTANT: Return ONLY the JSON object without markdown formatting.`
    },
    {
      role: 'user',
      content: `Generate my daily agenda for ${currentDate}. Focus on high-impact activities that will move me closer to: ${goalTitle}`
    }
  ];

  try {
    const response = await callAI(messages);
    const cleanedResponse = cleanJsonResponse(response);
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('Error generating daily agenda:', error);
    return {
      tasks: [
        {
          title: `Work on ${goalTitle}`,
          description: 'Make meaningful progress on your goal',
          xpValue: 40,
          priority: 'high' as const,
          estimatedTime: '45 min'
        }
      ],
      motivation: "Let's make today count! Every small step brings you closer to your goal."
    };
  }
};

// Generate motivation messages based on missed tasks/streaks
export const generateMotivationMessage = async (
  missedTaskCount: number,
  missedStreakCount: number,
  preferredTone: MotivationTone,
  goalTitle: string,
  streakDays: number
): Promise<string> => {
  const escalationLevel = Math.min(Math.floor((missedTaskCount + missedStreakCount) / 2), 3);
  
  const tonePrompts = {
    'data-driven': 'Focus on statistics, progress metrics, and logical consequences. Be analytical.',
    'tough-love': 'Be direct, challenging, and hold them accountable. Push for action like David Goggins.'
  };

  const escalationPrompts: { [key: number]: string } = {
    0: 'Gentle reminder about staying on track',
    1: 'More direct encouragement to get back on track', 
    2: 'Firm but supportive push to recommit',
    3: 'Strong accountability message about the importance of consistency'
  };

  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are Hustle, sending a motivation message to help the user get back on track.

Context:
- Goal: ${goalTitle}
- Current streak: ${streakDays} days
- Missed tasks: ${missedTaskCount}
- Missed streak tasks: ${missedStreakCount}
- Escalation level: ${escalationLevel}/3

Tone: ${tonePrompts[preferredTone]}
Escalation: ${escalationPrompts[escalationLevel]}

Keep the message concise (1-2 sentences) but impactful. The goal is to motivate action, not guilt.`
    },
    {
      role: 'user',
      content: `I've missed ${missedTaskCount} tasks and ${missedStreakCount} streak tasks. Send me a ${preferredTone} motivation message to get back on track with my goal: ${goalTitle}`
    }
  ];

  try {
    const response = await callAI(messages);
    return response.trim();
  } catch (error) {
    console.error('Error generating motivation message:', error);
    
    // Fallback messages based on tone
    const fallbacks = {
      'data-driven': `You're ${streakDays} days into your journey. Consistency compounds - one task today can restart your momentum.`,
      'tough-love': "Excuses don't build dreams. Your goal won't achieve itself. Time to step up and take action."
    };
    
    return fallbacks[preferredTone];
  }
};

// Process conversational commands for task/event creation
export const processConversationalCommand = async (
  userInput: string,
  currentTasks: Array<{ title: string; date: string; isHabit: boolean }>,
  currentDate: string,
  activeGoal?: { title: string; description: string }
): Promise<{
  action: 'create_task' | 'create_event' | 'update_task' | 'reschedule' | 'query' | 'none';
  taskData?: {
    title: string;
    description: string;
    date: string;
    time?: string;
    isHabit: boolean;
    xpValue: number;
    proofMode?: 'realtime' | 'flex';
  };
  eventData?: {
    title: string;
    description?: string;
    date: string;
    time?: string;
  };
  updateData?: {
    taskId?: string;
    newDate?: string;
    newTime?: string;
  };
  confirmation: string;
  needsClarification?: boolean;
  clarificationQuestion?: string;
}> => {
  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are Hustle's command processor. Analyze user input and determine the appropriate action.

Current date: ${currentDate}
Active goal: ${activeGoal ? `${activeGoal.title} - ${activeGoal.description}` : 'None'}
Existing tasks: ${currentTasks.map(t => `${t.title} (${t.date})`).join(', ')}

Determine if the user wants to:
- create_task: Create a new task or habit
- create_event: Schedule an event or meeting
- update_task: Modify an existing task
- reschedule: Move a task to different time/date
- query: Ask about progress, tasks, or goals
- none: General conversation or unclear intent

For task creation, determine:
- title: Clear, actionable task name
- description: Brief explanation
- date: YYYY-MM-DD format
- time: HH:MM format if specified
- isHabit: true for recurring/daily tasks
- xpValue: 20-50 based on complexity
- proofMode: "realtime" for photo proof, "flex" for flexible proof

Date parsing:
- "today" = ${currentDate}
- "tomorrow" = next day
- "Monday", "Tuesday", etc. = next occurrence
- "next week" = 7 days from now

Time parsing:
- "morning" = 09:00
- "afternoon" = 14:00
- "evening" = 18:00
- "night" = 20:00

Respond with JSON:
{
  "action": "create_task|create_event|update_task|reschedule|query|none",
  "taskData": { /* if creating task */ },
  "eventData": { /* if creating event */ },
  "updateData": { /* if updating/rescheduling */ },
  "confirmation": "Natural language confirmation",
  "needsClarification": false,
  "clarificationQuestion": "Question if clarification needed"
}

IMPORTANT: Return ONLY the JSON object without markdown formatting.`
    },
    {
      role: 'user',
      content: userInput
    }
  ];

  try {
    const response = await callAI(messages);
    const cleanedResponse = cleanJsonResponse(response);
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('Error processing conversational command:', error);
    return {
      action: 'none',
      confirmation: "I couldn't understand that command. Try something like 'Add workout tomorrow at 8 AM' or 'Schedule meeting Friday at 2 PM'."
    };
  }
};

export async function generateTasksWithContext(
  goalTitle: string,
  goalDescription: string,
  context: GoalContext
): Promise<{ tasks: TaskCandidate[]; rejected: Array<{ title: string; reason: string }> }> {
  try {
    const systemPrompt = `You are Hustle, an AI task generator for the Grind app. Generate realistic, actionable tasks based on the goal clarification context.

Goal Context:
- Outcome: ${context.outcome} ${context.unit}
- Daily Minutes Available: ${context.dailyMinutes}
- Preferred Proof: ${context.proofPrefs}
- Milestones: ${context.milestones.join(', ')}
- Constraints: ${context.constraints}

Generate 3-5 Today Tasks and 1-2 Streak Habits. Each task should have:
- title: Clear, actionable task name
- description: Brief explanation
- isHabit: true for daily streaks, false for one-time tasks
- xpValue: 20-50 XP based on difficulty
- loadScore: 1-3 based on time/effort (total should not exceed 5 for today tasks)
- proofMode: "realtime" for photo/immediate proof, "flex" for flexible proof

Return only a JSON array of tasks. No markdown formatting.`;

    const userPrompt = `Generate tasks for goal: "${goalTitle}" - ${goalDescription}`;

    const response = await callAI([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]);

    // Parse AI response
    let rawTasks: TaskCandidate[] = [];
    try {
      const cleanedResponse = response
        .replace(/```json\s*/g, '')
        .replace(/```\s*$/g, '')
        .replace(/```/g, '')
        .trim();
        
      let jsonToParse = cleanedResponse;
      if (!cleanedResponse.startsWith('[')) {
        const match = cleanedResponse.match(/\[[\s\S]*\]/);
        if (match) {
          jsonToParse = match[0];
        }
      }
      
      rawTasks = JSON.parse(jsonToParse);
    } catch (error) {
      console.error('Error parsing AI response:', error);
      // Fallback tasks
      rawTasks = [
        {
          title: `Work on ${goalTitle} - ${context.dailyMinutes} min session`,
          description: `Focused work session toward: ${goalDescription.substring(0, 50)}...`,
          isHabit: false,
          xpValue: 40,
          loadScore: 2,
          proofMode: 'flex'
        },
        {
          title: `Daily progress check for ${goalTitle}`,
          description: 'Review and track your daily progress',
          isHabit: true,
          xpValue: 20,
          loadScore: 1,
          proofMode: context.proofPrefs === 'photo' ? 'realtime' : 'flex'
        }
      ];
    }

    // Apply post-processing
    return postProcessTasks(rawTasks, context);
    
  } catch (error) {
    console.error('Error generating tasks with context:', error);
    throw error;
  }
}

// Enhanced image validation with detailed feedback
export const validateTaskImageWithFeedback = async (
  taskTitle: string,
  taskDescription: string,
  imageBase64: string
): Promise<{
  isValid: boolean;
  confidence: 'high' | 'medium' | 'low';
  feedback: string;
  suggestions?: string[];
}> => {
  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are Hustle's vision validator. Analyze the image to determine if it shows valid proof of task completion.

Provide detailed, constructive feedback with confidence levels:
- HIGH: Clear, obvious proof of task completion
- MEDIUM: Related to task but could be clearer
- LOW: Unclear or potentially unrelated

For medium/low confidence, provide specific suggestions for better proof.

Respond with JSON:
{
  "isValid": boolean,
  "confidence": "high|medium|low", 
  "feedback": "Detailed explanation of what you see",
  "suggestions": ["specific suggestion 1", "specific suggestion 2"] // only if confidence is medium/low
}

IMPORTANT: Return ONLY the JSON object without markdown formatting.`
    },
    {
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Task: ${taskTitle}
Description: ${taskDescription}

Please analyze this image and provide detailed validation feedback.`
        },
        {
          type: 'image',
          image: imageBase64
        }
      ]
    }
  ];

  try {
    const response = await callAI(messages);
    const cleanedResponse = cleanJsonResponse(response);
    const result = JSON.parse(cleanedResponse);
    
    return {
      isValid: result.isValid,
      confidence: result.confidence || 'medium',
      feedback: result.feedback,
      suggestions: result.suggestions
    };
  } catch (error) {
    console.error('Error validating image with feedback:', error);
    return {
      isValid: true,
      confidence: 'medium',
      feedback: "I couldn't analyze the image properly, but I'll trust that you completed the task. Keep up the great work!",
      suggestions: ["Try taking a clearer photo next time", "Ensure good lighting for better validation"]
    };
  }
};

// Generate nightly recap and rescheduling suggestions
export const generateNightlyRecap = async (
  completedTasks: Array<{ title: string; xpValue: number }>,
  incompleteTasks: Array<{ title: string; description: string }>,
  goalTitle: string,
  preferredTone: MotivationTone
): Promise<{
  recap: string;
  rescheduleSuggestions: Array<{
    taskTitle: string;
    suggestedDate: string;
    reason: string;
  }>;
  tomorrowFocus: string;
}> => {
  const toneInstructions = {

    'data-driven': 'Focus on metrics, progress analysis, and optimization',
    'tough-love': 'Be honest about performance and push for better tomorrow'
  };

  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are Hustle providing a nightly recap. Analyze the day's performance and provide actionable insights.

Goal: ${goalTitle}
Completed: ${completedTasks.length} tasks (${completedTasks.reduce((sum, t) => sum + t.xpValue, 0)} XP)
Incomplete: ${incompleteTasks.length} tasks

Tone: ${toneInstructions[preferredTone]}

Provide a balanced recap that celebrates wins and addresses incomplete tasks constructively.

Respond with JSON:
{
  "recap": "2-3 sentence summary of the day",
  "rescheduleSuggestions": [
    {
      "taskTitle": "task name",
      "suggestedDate": "tomorrow|this-week|next-week",
      "reason": "why reschedule to this time"
    }
  ],
  "tomorrowFocus": "Key focus area for tomorrow"
}

IMPORTANT: Return ONLY the JSON object without markdown formatting.`
    },
    {
      role: 'user',
      content: `Generate my nightly recap. Completed: ${completedTasks.map(t => t.title).join(', ')}. Incomplete: ${incompleteTasks.map(t => t.title).join(', ')}`
    }
  ];

  try {
    const response = await callAI(messages);
    const cleanedResponse = cleanJsonResponse(response);
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('Error generating nightly recap:', error);
    return {
      recap: `You completed ${completedTasks.length} tasks today! Every step forward counts toward your goal.`,
      rescheduleSuggestions: incompleteTasks.slice(0, 2).map(task => ({
        taskTitle: task.title,
        suggestedDate: 'tomorrow',
        reason: 'Continue momentum from today'
      })),
      tomorrowFocus: 'Focus on your highest-impact tasks first thing in the morning.'
    };
  }
};

// Generate daily tasks based on the user's goal
export const generateDailyTasksForGoal = async (
  goalTitle: string,
  goalDescription: string,
  deadline: string,
  previousTasks: string[] = [],
  currentDate: string
): Promise<string> => {
  // Format date for better readability in the prompt
  const formattedDate = new Date(currentDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are Hustle, an AI assistant for the Grind app that helps users achieve their long-term goals. 
      Your job is to generate 4-6 specific, actionable daily tasks that will help the user make progress toward their goal.
      
      Create two types of tasks:
      1. Today Tasks: One-time tasks specific to today (${formattedDate}) that move the user toward their goal. These should be UNIQUE for each day and NOT repetitive.
      2. Streak Tasks: Daily habits that should be maintained consistently (marked with isHabit: true)
      
      Tasks should be:
      - Concrete and measurable
      - Specific enough to be validated with a photo
      - Varied in difficulty and approach
      - Aligned with the user's goal
      - Realistic to complete in a day
      - Appropriate for the specific day of the week and date (${formattedDate})
      
      IMPORTANT: For Today Tasks, consider the day of the week, the date, and create tasks that are specifically relevant to ${formattedDate}. 
      DO NOT generate generic tasks that could apply to any day. Make them contextual to this specific date.
      
      Format your response as a JSON array of task objects with these properties:
      - title: String (clear, concise task name)
      - description: String (detailed instructions, 1-2 sentences)
      - isHabit: Boolean (true for streak tasks, false for today tasks)
      - xpValue: Number (20-50, based on difficulty)
      
      Include at least one Streak Task (habit) in your response.
      
      IMPORTANT: Return ONLY the JSON array without any markdown formatting, explanation, or code block syntax.
      DO NOT include \`\`\`json or \`\`\` in your response. Return only the raw JSON array.`
    },
    {
      role: 'user',
      content: `My goal is: ${goalTitle}
      
      Description: ${goalDescription}
      
      Deadline: ${deadline}
      
      Today's date: ${formattedDate}
      
      Previous tasks I've completed: ${previousTasks.length > 0 ? previousTasks.join(', ') : 'None yet'}
      
      Please generate detailed, high-quality tasks to help me make progress toward my goal for specifically ${formattedDate}. Include both unique one-time tasks for today and streak tasks (habits) I should maintain daily.`
    }
  ];

  return await callAI(messages);
};

// Generate AI coaching feedback
export const generateCoachingFeedback = async (
  goalTitle: string,
  recentTasks: { title: string; completed: boolean }[],
  streakDays: number
): Promise<string> => {
  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are Hustle, an AI coach for the Grind app. Provide motivational, insightful coaching to help the user stay on track with their goals.
      Keep your response concise (2-3 paragraphs max), encouraging, and action-oriented.
      
      DO NOT format your response as JSON or use any markdown formatting.`
    },
    {
      role: 'user',
      content: `My goal is: ${goalTitle}
      
      Recent tasks: ${recentTasks.map(t => `${t.title} (${t.completed ? 'Completed' : 'Not completed'})`).join(', ')}
      
      Current streak: ${streakDays} days
      
      How am I doing? What should I focus on next?`
    }
  ];

  return await callAI(messages);
};

// Validate image proof for task completion (legacy function for backward compatibility)
export const validateTaskImage = async (
  taskTitle: string,
  taskDescription: string,
  imageBase64: string
): Promise<{ isValid: boolean; feedback: string }> => {
  const result = await validateTaskImageWithFeedback(taskTitle, taskDescription, imageBase64);
  return {
    isValid: result.isValid,
    feedback: result.feedback
  };
};

// Generate smart reschedule suggestions
export const generateRescheduleSuggestions = async (
  incompleteTasks: Array<{ title: string; description: string; priority?: string }>,
  currentDate: string,
  goalTitle: string
): Promise<Array<{
  taskTitle: string;
  suggestedDate: string;
  suggestedTime?: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
}>> => {
  const messages: AIMessage[] = [
    {
      role: 'system',
      content: `You are Hustle's smart scheduler. Analyze incomplete tasks and suggest optimal rescheduling.

Current date: ${currentDate}
Goal context: ${goalTitle}

Consider:
- Task priority and complexity
- Optimal timing for different task types
- Workload distribution
- Goal momentum

Respond with JSON array:
[
  {
    "taskTitle": "task name",
    "suggestedDate": "YYYY-MM-DD",
    "suggestedTime": "HH:MM (optional)",
    "reason": "why this timing is optimal",
    "priority": "high|medium|low"
  }
]

IMPORTANT: Return ONLY the JSON array without markdown formatting.`
    },
    {
      role: 'user',
      content: `Reschedule these incomplete tasks: ${incompleteTasks.map(t => `${t.title} - ${t.description}`).join('; ')}`
    }
  ];

  try {
    const response = await callAI(messages);
    const cleanedResponse = cleanJsonResponse(response);
    return JSON.parse(cleanedResponse);
  } catch (error) {
    console.error('Error generating reschedule suggestions:', error);
    return incompleteTasks.map(task => ({
      taskTitle: task.title,
      suggestedDate: currentDate,
      reason: 'Continue working on this task',
      priority: (task.priority as 'high' | 'medium' | 'low') || 'medium'
    }));
  }
};
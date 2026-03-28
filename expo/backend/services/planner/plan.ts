import { buildPlannerPrompt, buildFallbackPlan } from './prompt';
import { validatePlan, type PlanData } from './schema';

interface PlanRequest {
  goal: {
    title: string;
    description: string;
    deadlineISO: string;
  };
  user: {
    id: string;
    experience_level?: string;
  };
  timezone: number;
  agendaTime: string;
  now: Date;
}

interface PlanResult {
  success: boolean;
  plan?: PlanData;
  error?: string;
  source: 'ai' | 'fallback';
  retryCount: number;
}

export async function generatePlan(request: PlanRequest): Promise<PlanResult> {
  const { goal, user, timezone, agendaTime, now } = request;
  
  // Calculate days to deadline for fallback
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadline = new Date(goal.deadlineISO);
  const deadlineDate = new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate());
  const daysToDeadline = Math.max(1, Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  
  console.log(`Generating plan for "${goal.title}" (${daysToDeadline} days)`);
  
  // Try AI generation with retries
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      console.log(`AI generation attempt ${attempt}/2`);
      
      const prompt = buildPlannerPrompt(goal, user, timezone, agendaTime, now);
      
      const response = await fetch('https://toolkit.rork.com/text/llm/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });
      
      if (!response.ok) {
        throw new Error(`AI API request failed: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (!result.completion) {
        throw new Error('AI API returned no completion');
      }
      
      // Try to parse JSON from the completion
      let planData: any;
      try {
        // Extract JSON from the response (in case there's extra text)
        const jsonMatch = result.completion.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in AI response');
        }
        planData = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.warn(`JSON parse failed on attempt ${attempt}:`, parseError);
        if (attempt === 2) {
          throw new Error(`Failed to parse AI response as JSON: ${parseError}`);
        }
        continue;
      }
      
      // Validate the plan
      const validation = validatePlan(planData);
      
      if (!validation.success) {
        console.warn(`Plan validation failed on attempt ${attempt}:`, validation.error);
        if (validation.details) {
          console.warn('Validation details:', validation.details);
        }
        
        if (attempt === 2) {
          throw new Error(`Plan validation failed: ${validation.error}`);
        }
        continue;
      }
      
      console.log(`AI plan generated successfully on attempt ${attempt}`);
      return {
        success: true,
        plan: validation.data!,
        source: 'ai',
        retryCount: attempt
      };
      
    } catch (error) {
      console.warn(`AI generation attempt ${attempt} failed:`, error);
      
      if (attempt === 2) {
        console.log('Falling back to deterministic plan generation');
        break;
      }
    }
  }
  
  // Fallback to deterministic plan
  try {
    console.log('Generating fallback plan');
    const fallbackPlan = buildFallbackPlan(goal, daysToDeadline);
    
    const validation = validatePlan(fallbackPlan);
    
    if (!validation.success) {
      throw new Error(`Fallback plan validation failed: ${validation.error}`);
    }
    
    console.log('Fallback plan generated successfully');
    return {
      success: true,
      plan: validation.data!,
      source: 'fallback',
      retryCount: 2
    };
    
  } catch (error) {
    console.error('Fallback plan generation failed:', error);
    return {
      success: false,
      error: `Both AI and fallback plan generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      source: 'fallback',
      retryCount: 2
    };
  }
}
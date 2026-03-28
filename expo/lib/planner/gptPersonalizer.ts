export type PersonalizeInput = {
  title: string;
  description?: string;
  category?: string;
  streaks: { title: string; description: string }[];
  schedule: { title: string; description: string; dateISO: string }[];
};

export async function personalizeWithGPT5(input: PersonalizeInput) {
  const key = process.env.GPT5_API_KEY;
  const model = process.env.GPT5_MODEL || 'gpt-5';
  const base = process.env.GPT5_API_BASE || 'https://api.openai.com/v1';
  if (!key) return input;

  const system = `You are Hustle, a disciplined but helpful coach.\nRefine titles/descriptions for clarity and motivation. Do not change dates or counts.\nKeep streak items habit-like. Keep schedule task dates identical.`;

  const user = JSON.stringify(input);
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.4 })
    });
    const json = await res.json();
    const content: string | undefined = json?.choices?.[0]?.message?.content;
    const parsed = content ? JSON.parse(content) : {};
    const out: PersonalizeInput = JSON.parse(JSON.stringify(input));
    if (Array.isArray(parsed.streaks)) {
      for (let i = 0; i < Math.min(out.streaks.length, parsed.streaks.length); i++) {
        out.streaks[i].title = parsed.streaks[i].title || out.streaks[i].title;
        out.streaks[i].description = parsed.streaks[i].description || out.streaks[i].description;
      }
    }
    if (Array.isArray(parsed.schedule)) {
      for (let i = 0; i < Math.min(out.schedule.length, parsed.schedule.length); i++) {
        out.schedule[i].title = parsed.schedule[i].title || out.schedule[i].title;
        out.schedule[i].description = parsed.schedule[i].description || out.schedule[i].description;
      }
    }
    return out;
  } catch (_e) {
    return input;
  }
}

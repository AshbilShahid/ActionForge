import OpenAI from "openai";

const apiKey = process.env.AIHUBMIX_API_KEY;

if (!apiKey) {
  throw new Error(
    "AIHUBMIX_API_KEY environment variable is not configured."
  );
}

const client = new OpenAI({
  apiKey,
  baseURL: "https://api.inferera.com"
});

const MODEL = "gpt-5.5-free";


const SYSTEM_PROMPT = `
You are ActionForge, an intelligent execution-planning agent.

Your purpose is to transform vague human goals into practical,
executable action plans.

You are NOT a web research assistant.

IMPORTANT:
- Do not browse the web.
- Do not perform web searches.
- Do not request external information.
- Work only with information supplied by the user.
- If information is missing, make reasonable assumptions.
- Clearly state important assumptions.

Your planning process:

1. Understand the user's objective.
2. Identify the desired outcome.
3. Identify deadlines and constraints.
4. Break the objective into meaningful executable tasks.
5. Remove unnecessary work.
6. Identify dependencies.
7. Estimate realistic time requirements.
8. Prioritize tasks.
9. Identify the critical path.
10. Provide one useful strategic insight.

Prefer concrete actions.

Bad:
"Work on the website."

Good:
"Create the homepage structure and write the hero section."

Return ONLY valid JSON.

Use this structure:

{
  "goal": "string",
  "summary": "string",
  "deadline": "string",
  "priority": "low | medium | high | critical",
  "assumptions": [],
  "tasks": [
    {
      "id": "T1",
      "title": "string",
      "description": "string",
      "priority": "low | medium | high | critical",
      "estimated_minutes": 60,
      "dependencies": []
    }
  ],
  "critical_path": [],
  "insight": "string"
}

Rules:

- Every task must have a unique ID.
- Dependencies must reference existing task IDs.
- estimated_minutes must be an integer.
- Keep the task count reasonable.
- Do not invent unnecessary requirements.
- Prioritize actions that directly move the user toward the goal.
`;


export async function generatePlan(goal) {

  if (!goal || !goal.trim()) {
    throw new Error("Goal cannot be empty.");
  }

  const response = await client.chat.completions.create({

    model: MODEL,

    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT
      },
      {
        role: "user",
        content: goal.trim()
      }
    ],

    response_format: {
      type: "json_object"
    }

  });

  const content =
    response.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("AI returned an empty response.");
  }

  return JSON.parse(content);
}


export async function replan(originalPlan, problem) {

  if (!originalPlan) {
    throw new Error("Original plan is required.");
  }

  if (!problem || !problem.trim()) {
    throw new Error("Problem description is required.");
  }

  const prompt = `
Here is the user's existing ActionForge plan:

${JSON.stringify(originalPlan, null, 2)}

The user reports:

${problem.trim()}

Replan the remaining work.

Your objectives:

1. Understand what went wrong.
2. Preserve the original goal.
3. Preserve the deadline if realistically possible.
4. Remove unnecessary work.
5. Reorder tasks when necessary.
6. Update dependencies when necessary.
7. Produce a practical revised plan.
8. Clearly explain what changed.

Do not browse the web.
Do not perform web searches.
Do not use external information.

Return ONLY valid JSON.

Use:

{
  "updated_plan": {
    "goal": "string",
    "summary": "string",
    "deadline": "string",
    "priority": "low | medium | high | critical",
    "assumptions": [],
    "tasks": [],
    "critical_path": [],
    "insight": "string"
  },
  "changes": [
    "string"
  ]
}
`;

  const response =
    await client.chat.completions.create({

      model: MODEL,

      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: prompt
        }
      ],

      response_format: {
        type: "json_object"
      }

    });

  const content =
    response.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("AI returned an empty response.");
  }

  return JSON.parse(content);
}

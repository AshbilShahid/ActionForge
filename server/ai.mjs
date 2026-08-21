/* =========================================================
   ACTIONFORGE AI ENGINE
   Provider-independent OpenAI-compatible API
   ========================================================= */

const apiKey = process.env.AI_API_KEY;

if (!apiKey) {
    throw new Error(
        "AI_API_KEY is missing from the Netlify Function environment."
    );
}


/* =========================================================
   PROVIDER CONFIGURATION
   ========================================================= */

const API_URL =
    process.env.AI_BASE_URL ||
    "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

const MODEL =
    process.env.AI_MODEL ||
    "gemini-3.7-flash-free";


/*
 * Only log safe diagnostic information.
 * Never log the complete API key.
 */
console.log(
    "ActionForge AI configuration:",
    {
        baseURL: API_URL,
        model: MODEL,
        keyDetected:
            apiKey.slice(0, 3) +
            "..." +
            apiKey.slice(-4)
    }
);


/* =========================================================
   SYSTEM PROMPT
   ========================================================= */

const SYSTEM_PROMPT = `

You are ActionForge, an intelligent execution-planning agent.

Your purpose is to transform vague human goals into practical,
executable action plans.

You are NOT a web research assistant.

IMPORTANT:

- Do not browse the web.
- Do not perform web searches.
- Do not use web-search tools.
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

Avoid vague tasks.

Bad:

"Work on the website."

Good:

"Create the homepage structure and write the hero section."

Keep the number of tasks reasonable.

Every task should directly contribute toward the user's goal.


RETURN ONLY VALID JSON.

Use this structure:

{
  "goal": "string",
  "summary": "string",
  "deadline": "string",
  "priority": "low | medium | high | critical",

  "assumptions": [
    "string"
  ],

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

  "critical_path": [
    "T1",
    "T2"
  ],

  "insight": "string"
}


RULES:

- Every task must have a unique ID.
- Dependencies must reference existing task IDs.
- critical_path must reference existing task IDs.
- estimated_minutes must be an integer.
- Keep the task count reasonable.
- Do not invent unnecessary requirements.
- Prioritize actions that directly move the user toward the goal.
- Do not include markdown.
- Do not wrap JSON in code fences.
- Return JSON only.

`;


/* =========================================================
   AI REQUEST
   ========================================================= */

async function callAI(messages) {

    console.log(
        `ActionForge calling model: ${MODEL}`
    );


    const response = await fetch(
        API_URL,
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json",

                "Authorization":
                    `Bearer ${apiKey.trim()}`
            },

            body: JSON.stringify({

                model: MODEL,

                messages: messages,

                response_format: {
                    type: "json_object"
                }

            })
        }
    );


    const text = await response.text();


    console.log(
        `AI provider response status: ${response.status}`
    );


    if (!response.ok) {

        throw new Error(
            `${response.status} ${text}`
        );

    }


    let data;

    try {

        data = JSON.parse(text);

    } catch {

        throw new Error(
            "AI provider returned invalid JSON."
        );

    }


    return data;
}


/* =========================================================
   GENERATE PLAN
   ========================================================= */

export async function generatePlan(goal) {

    if (
        !goal ||
        typeof goal !== "string" ||
        !goal.trim()
    ) {

        throw new Error(
            "Goal cannot be empty."
        );

    }


    const data = await callAI([

        {
            role: "system",
            content: SYSTEM_PROMPT
        },

        {
            role: "user",
            content: goal.trim()
        }

    ]);


    const content =
        data?.choices?.[0]?.message?.content;


    if (!content) {

        throw new Error(
            "AI returned an empty response."
        );

    }


    try {

        return JSON.parse(content);

    } catch {

        console.error(
            "Invalid JSON returned by AI:",
            content
        );

        throw new Error(
            "AI returned invalid JSON."
        );

    }

}


/* =========================================================
   REPLAN
   ========================================================= */

export async function replan(
    originalPlan,
    problem
) {

    if (!originalPlan) {

        throw new Error(
            "Original plan is required."
        );

    }


    if (
        !problem ||
        typeof problem !== "string" ||
        !problem.trim()
    ) {

        throw new Error(
            "Problem description is required."
        );

    }


    const prompt = `

Here is the user's existing ActionForge plan:

${JSON.stringify(
    originalPlan,
    null,
    2
)}


The user reports:

${problem.trim()}


Adapt the existing plan.

Do NOT simply create an unrelated new plan.

Preserve the original goal.

Determine:

1. What changed.
2. Which tasks should be removed.
3. Which tasks should be reordered.
4. Which tasks should be modified.
5. Whether the deadline is still realistic.
6. What the new critical path is.


Do not browse the web.

Do not perform web searches.

Do not use web-search tools.

Do not use external information.


RETURN ONLY VALID JSON.


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


RULES:

- Every task must have a unique ID.
- Dependencies must reference existing task IDs.
- critical_path must reference existing task IDs.
- estimated_minutes must be an integer.
- Keep the task count reasonable.
- Focus on adapting the existing plan.
- Do not include markdown.
- Do not wrap JSON in code fences.
- Return JSON only.

`;


    const data = await callAI([

        {
            role: "system",
            content: SYSTEM_PROMPT
        },

        {
            role: "user",
            content: prompt
        }

    ]);


    const content =
        data?.choices?.[0]?.message?.content;


    if (!content) {

        throw new Error(
            "AI returned an empty response."
        );

    }


    try {

        return JSON.parse(content);

    } catch {

        console.error(
            "Invalid replanning JSON:",
            content
        );

        throw new Error(
            "AI returned invalid JSON while replanning."
        );

    }

}

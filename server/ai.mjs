import { GoogleGenAI } from "@google/genai";


/* =========================================================
   ACTIONFORGE — AI ENGINE
   AIHubMix Gemini Native API
   ========================================================= */


const apiKey = process.env.AIHUBMIX_API_KEY;

if (!apiKey) {
    throw new Error(
        "AIHUBMIX_API_KEY is missing from the Netlify Function environment."
    );
}


/* =========================================================
   AIHUBMIX GEMINI CONFIGURATION
   ========================================================= */

const MODEL = "gemini-3.7-flash-free";


const ai = new GoogleGenAI({
    apiKey: apiKey.trim(),

    httpOptions: {
        baseUrl: "https://aihubmix.com/gemini"
    }
});


console.log(
    "ActionForge Gemini configuration loaded:",
    {
        model: MODEL,
        apiKeyDetected:
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
realistic, executable action plans.

You help users turn ideas and objectives into concrete steps.

IMPORTANT:

You are NOT a web research assistant.

DO NOT:

- Browse the web.
- Perform web searches.
- Use Google Search.
- Use external search tools.
- Request external information.
- Search for facts outside the information supplied by the user.

Work only with the information provided by the user.

If information is missing:

1. Make reasonable assumptions.
2. Put those assumptions into the assumptions field.

Your planning process:

1. Understand the user's objective.
2. Identify the desired outcome.
3. Identify deadlines.
4. Identify constraints.
5. Break the objective into executable tasks.
6. Remove unnecessary work.
7. Identify dependencies.
8. Estimate realistic time requirements.
9. Prioritize tasks.
10. Identify the critical path.
11. Provide one useful strategic insight.

Prefer concrete actions over vague advice.

Bad:

"Work on the website."

Good:

"Create the homepage structure and write the hero section."

Every task must directly contribute toward the user's goal.

Keep the number of tasks reasonable.


=========================================================
OUTPUT FORMAT
=========================================================

RETURN ONLY VALID JSON.

Do NOT use markdown.

Do NOT wrap JSON in code fences.

Do NOT write explanations outside the JSON.

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


=========================================================
RULES
=========================================================

- Every task must have a unique ID.
- Use T1, T2, T3, etc.
- Dependencies must reference existing task IDs.
- critical_path must reference existing task IDs.
- estimated_minutes must be an integer.
- Keep the task count reasonable.
- Do not invent unnecessary requirements.
- Prioritize actions that directly move the user toward the goal.
- Make the plan practical.
- Respect user-provided deadlines.
- Return JSON only.

`;


/* =========================================================
   GENERATE CONTENT
   ========================================================= */

async function generateContent(prompt) {

    console.log(
        `ActionForge calling ${MODEL}`
    );


    try {

        const response =
            await ai.models.generateContent({

                model: MODEL,

                contents: prompt,

                config: {

                    systemInstruction:
                        SYSTEM_PROMPT,

                    temperature: 0.3,

                    responseMimeType:
                        "application/json"

                }

            });


        const text =
            response?.text;


        if (!text) {

            throw new Error(
                "Gemini returned an empty response."
            );

        }


        console.log(
            "ActionForge received AI response successfully."
        );


        return text;


    } catch (error) {

        console.error(
            "Gemini / AIHubMix error:",
            error
        );


        throw new Error(
            error?.message ||
            "AI request failed."
        );

    }

}


/* =========================================================
   PARSE JSON
   ========================================================= */

function parseJSON(text) {

    if (!text) {

        throw new Error(
            "AI returned an empty response."
        );

    }


    try {

        return JSON.parse(text);

    } catch (error) {

        console.error(
            "Invalid JSON returned by Gemini:",
            text
        );


        /*
         * Attempt to remove accidental markdown fences.
         */

        const cleaned =
            text
                .replace(/^```json\s*/i, "")
                .replace(/^```\s*/i, "")
                .replace(/\s*```$/i, "")
                .trim();


        try {

            return JSON.parse(cleaned);

        } catch {

            throw new Error(
                "AI returned invalid JSON."
            );

        }

    }

}


/* =========================================================
   GENERATE INITIAL PLAN
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


    if (goal.length > 5000) {

        throw new Error(
            "Goal is too long. Please keep it under 5000 characters."
        );

    }


    const prompt = `

Create an ActionForge execution plan for this goal:

${goal.trim()}

Remember:

- Do not browse the web.
- Do not search the web.
- Do not use Google Search.
- Use only the information supplied above.
- Return JSON only.

`;


    const text =
        await generateContent(prompt);


    return parseJSON(text);

}


/* =========================================================
   REALITY CHECK / REPLAN
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

An ActionForge user already has this plan:

${JSON.stringify(
    originalPlan,
    null,
    2
)}


The user has encountered this problem:

${problem.trim()}


Adapt the existing plan to the new reality.

DO NOT create an unrelated plan.

Preserve the original goal.

Analyze:

1. What changed?
2. Which tasks are no longer necessary?
3. Which tasks need modification?
4. Which tasks should be reordered?
5. Which dependencies changed?
6. Is the original deadline still realistic?
7. What is now the critical path?
8. What should the user focus on immediately?


Return ONLY valid JSON.

Use this structure:

{
  "updated_plan": {
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
  },

  "changes": [
    "string"
  ]
}


IMPORTANT:

Do not browse the web.

Do not perform web searches.

Do not use Google Search.

Do not use external tools.

Use only the existing plan and the user's problem.

Return JSON only.

`;


    const text =
        await generateContent(prompt);


    return parseJSON(text);

}

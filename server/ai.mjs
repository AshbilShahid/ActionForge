import OpenAI from "openai";

const apiKey = process.env.AIHUBMIX_API_KEY;

if (!apiKey) {
    throw new Error(
        "AIHUBMIX_API_KEY is missing from the Netlify Function environment."
    );
}

const client = new OpenAI({
    apiKey: apiKey.trim(),
    baseURL: "https://aihubmix.com/v1"
});

const MODEL = "gemini-3.7-flash-free";


const SYSTEM_PROMPT = `
You are ActionForge, an intelligent execution-planning agent.

Transform the user's goal into a practical, executable action plan.

Do NOT browse the web.
Do NOT perform web searches.
Do NOT use web-search tools.
Work only with information provided by the user.

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
- critical_path must reference existing task IDs.
- estimated_minutes must be an integer.
- Keep the task count reasonable.
- Prioritize useful actions.
- Return JSON only.
`;


async function callAI(messages) {

    console.log(
        `Calling AIHubMix model: ${MODEL}`
    );

    try {

        const response =
            await client.chat.completions.create({

                model: MODEL,

                messages: messages,

                response_format: {
                    type: "json_object"
                }

            });

        console.log(
            `AIHubMix successfully responded using ${MODEL}`
        );

        return response;

    } catch (error) {

        console.error(
            "AIHubMix ERROR:",
            error?.status,
            error?.message
        );

        throw new Error(
            `${error?.status || 500} ${
                error?.message || "AI request failed"
            }`
        );
    }
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

    const response = await callAI([

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
        response?.choices?.[0]?.message?.content;

    if (!content) {

        throw new Error(
            "AI returned an empty response."
        );
    }

    try {

        return JSON.parse(content);

    } catch {

        console.error(
            "AI returned:",
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

Existing ActionForge plan:

${JSON.stringify(
    originalPlan,
    null,
    2
)}

The user reports:

${problem.trim()}

Adapt the existing plan.

Preserve the original goal.

Determine:

1. What changed.
2. Which tasks should be removed.
3. Which tasks should be modified.
4. Which tasks should be reordered.
5. Whether the deadline is still realistic.
6. What the new critical path is.

Do NOT browse the web.
Do NOT perform web searches.
Do NOT use web-search tools.

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
  "changes": []
}

Return JSON only.
`;


    const response = await callAI([

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
        response?.choices?.[0]?.message?.content;


    if (!content) {

        throw new Error(
            "AI returned an empty response."
        );
    }


    try {

        return JSON.parse(content);

    } catch {

        console.error(
            "AI returned:",
            content
        );

        throw new Error(
            "AI returned invalid JSON."
        );
    }
}

const apiKey = process.env.AIHUBMIX_API_KEY;

if (!apiKey) {
    throw new Error(
        "AIHUBMIX_API_KEY is missing from the Netlify Function environment."
    );
}

const API_URL = "https://aihubmix.com/v1/chat/completions";

const MODELS = [
    "gpt-5.5-free",
    "gpt-4.1-free",
    "gpt-4o-free"
];

const SYSTEM_PROMPT = `
You are ActionForge, an intelligent execution-planning agent.

Transform the user's goal into a practical action plan.

Do not browse the web.
Do not perform web searches.
Do not use external information.

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

Every task must have a unique ID.
Dependencies must reference existing task IDs.
estimated_minutes must be an integer.
Keep the number of tasks reasonable.
`;

async function callAI(messages) {

    let lastError = null;

    for (const model of MODELS) {

        try {

            console.log(
                `Trying AIHubMix model: ${model}`
            );

            const response = await fetch(
                API_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiKey.trim()}`
                    },

                    body: JSON.stringify({

                        model,

                        messages,

                        response_format: {
                            type: "json_object"
                        }

                    })
                }
            );

            const text = await response.text();

            console.log(
                `AIHubMix ${model} status: ${response.status}`
            );

            if (!response.ok) {

                lastError = new Error(
                    `${response.status} ${text}`
                );

                continue;
            }

            const data = JSON.parse(text);

            console.log(
                `Successfully used model: ${model}`
            );

            return data;

        } catch (error) {

            lastError = error;

            console.error(
                `Model ${model} failed:`,
                error.message
            );

        }
    }

    throw new Error(
        `All AI models failed. Last error: ${
            lastError?.message || "Unknown error"
        }`
    );
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
            "Invalid JSON from AI:",
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
3. Which tasks should be reordered.
4. Which tasks should be modified.
5. Whether the deadline is still realistic.
6. What the new critical path is.

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

/* =========================================================
   ACTIONFORGE AI ENGINE
   ========================================================= */

const apiKey =
    process.env.AI_API_KEY;


if (!apiKey) {

    throw new Error(
        "AI_API_KEY is missing."
    );

}


const API_URL =
    "https://api.b.ai/v1/chat/completions";


const MODEL =
    "deepseek-v4-flash";


/*
=============================================================
AI REQUEST TIMEOUT
=============================================================

Keep this below the normal Netlify function timeout so that
our application can return a clean error instead of allowing
the upstream connection to hang indefinitely.
*/

const AI_TIMEOUT_MS =
    25000;


/* =========================================================
   SYSTEM PROMPT
   ========================================================= */

const SYSTEM_PROMPT = `
You are ActionForge, an AI execution-planning assistant.

Your job is to turn a user's goal into a practical execution plan.

IMPORTANT:
- Do NOT browse the web.
- Do NOT perform web searches.
- Do NOT use Google Search.
- Do NOT use external search tools.
- Use only information supplied by the user.
- Make reasonable assumptions when information is missing.

Return ONLY valid JSON.
Do not use Markdown.
Do not use code fences.
Do not add text before or after the JSON.

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
- Every task has a unique ID.
- IDs are T1, T2, T3, etc.
- Dependencies reference existing task IDs.
- critical_path references existing task IDs.
- estimated_minutes is an integer.
- Keep the number of tasks reasonable.
`;


/* =========================================================
   REPLAN PROMPT
   ========================================================= */

const REPLAN_SYSTEM_PROMPT = `
You are ActionForge, an AI execution-planning assistant.

Adapt an existing execution plan when reality changes.

IMPORTANT:
- Do NOT browse the web.
- Do NOT perform web searches.
- Do NOT use Google Search.
- Do NOT use external search tools.
- Use only the existing plan and the user's new information.
- Preserve the original goal.
- Keep the plan practical.
- Keep the number of tasks reasonable.

Return ONLY valid JSON.
Do not use Markdown.
Do not use code fences.
Do not add text before or after the JSON.

Return exactly:

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
  "changes": []
}
`;


/* =========================================================
   CALL AI
   ========================================================= */

async function callAI(
    messages,
    maxTokens = 3000
) {

    const controller =
        new AbortController();


    const timeout =
        setTimeout(
            () => {
                controller.abort();
            },
            AI_TIMEOUT_MS
        );


    try {

        const response =
            await fetch(
                API_URL,
                {

                    method: "POST",

                    signal:
                        controller.signal,

                    headers: {

                        "Authorization":
                            `Bearer ${apiKey.trim()}`,

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            model:
                                MODEL,

                            messages,

                            temperature:
                                0.2,

                            max_tokens:
                                maxTokens

                        })

                }
            );


        const raw =
            await response.text();


        console.log(
            "B.AI status:",
            response.status
        );


        if (!response.ok) {

            console.error(
                "B.AI ERROR:",
                raw
            );


            if (
                raw.includes(
                    "Inactivity Timeout"
                )
            ) {

                throw new Error(
                    "AI service timed out. Please try again."
                );

            }


            throw new Error(
                `AI service returned ${response.status}.`
            );

        }


        let data;


        try {

            data =
                JSON.parse(raw);

        }
        catch {

            console.error(
                "NON-JSON AI RESPONSE:",
                raw
            );


            throw new Error(
                "AI service returned an invalid response."
            );

        }


        return data;

    }
    catch (error) {

        if (
            error.name === "AbortError"
        ) {

            throw new Error(
                "AI request timed out. Please try again."
            );

        }


        throw error;

    }
    finally {

        clearTimeout(timeout);

    }

}


/* =========================================================
   EXTRACT TEXT
   ========================================================= */

function extractText(
    data
) {

    if (
        data &&
        data.choices &&
        data.choices[0] &&
        data.choices[0].message
    ) {

        const content =
            data.choices[0].message.content;


        if (
            typeof content === "string" &&
            content.trim()
        ) {

            return content.trim();

        }

    }


    if (
        typeof data?.output_text ===
        "string"
    ) {

        return data.output_text.trim();

    }


    if (
        Array.isArray(data?.output)
    ) {

        for (
            const item
            of data.output
        ) {

            if (
                !Array.isArray(
                    item.content
                )
            ) {

                continue;

            }


            for (
                const content
                of item.content
            ) {

                if (
                    typeof content.text ===
                    "string" &&
                    content.text.trim()
                ) {

                    return content.text.trim();

                }

            }

        }

    }


    console.error(
        "FULL AI RESPONSE:",
        JSON.stringify(
            data,
            null,
            2
        )
    );


    throw new Error(
        "AI returned no usable text."
    );

}


/* =========================================================
   PARSE JSON
   ========================================================= */

function parseJSON(
    text
) {

    if (
        !text ||
        typeof text !== "string"
    ) {

        throw new Error(
            "AI returned an empty response."
        );

    }


    let cleaned =
        text.trim();


    cleaned =
        cleaned
            .replace(
                /^```json\s*/i,
                ""
            )
            .replace(
                /^```\s*/i,
                ""
            )
            .replace(
                /\s*```$/i,
                ""
            )
            .trim();


    /* Direct JSON */

    try {

        return JSON.parse(
            cleaned
        );

    }
    catch {
        // Continue.
    }


    /* Extract JSON object */

    const start =
        cleaned.indexOf(
            "{"
        );


    const end =
        cleaned.lastIndexOf(
            "}"
        );


    if (
        start !== -1 &&
        end !== -1 &&
        end > start
    ) {

        const extracted =
            cleaned.substring(
                start,
                end + 1
            );


        try {

            return JSON.parse(
                extracted
            );

        }
        catch {
            // Continue.
        }

    }


    console.error(
        "RAW AI RESPONSE:",
        cleaned
    );


    throw new Error(
        "AI returned invalid JSON."
    );

}


/* =========================================================
   GENERATE PLAN
   ========================================================= */

export async function generatePlan(
    goal
) {

    if (
        !goal ||
        typeof goal !== "string"
    ) {

        throw new Error(
            "Goal cannot be empty."
        );

    }


    if (
        goal.length > 5000
    ) {

        throw new Error(
            "Goal is too long."
        );

    }


    const userPrompt = `
Create an ActionForge execution plan for this goal:

${goal.trim()}

Return JSON only.
`;


    const data =
        await callAI(
            [
                {
                    role: "system",
                    content:
                        SYSTEM_PROMPT
                },
                {
                    role: "user",
                    content:
                        userPrompt
                }
            ],
            3500
        );


    const text =
        extractText(data);


    return parseJSON(
        text
    );

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
        typeof problem !== "string"
    ) {

        throw new Error(
            "Problem description is required."
        );

    }


    /*
    Keep this prompt deliberately compact.

    The previous version sent a large instruction block plus
    a verbose JSON plan. This increases latency and token usage.
    */

    const compactPlan =
        JSON.stringify(
            originalPlan
        );


    const userPrompt = `
EXISTING ACTIONFORGE PLAN:

${compactPlan}

NEW PROBLEM:

${problem.trim()}

Adapt the plan.

Requirements:
- Preserve the original goal.
- Modify only what needs to change.
- Recalculate task order and dependencies.
- Update the critical path.
- Determine whether the deadline remains realistic.
- Explain the important changes in "changes".
- Return JSON only.
`;


    const data =
        await callAI(
            [
                {
                    role: "system",
                    content:
                        REPLAN_SYSTEM_PROMPT
                },
                {
                    role: "user",
                    content:
                        userPrompt
                }
            ],
            3000
        );


    const text =
        extractText(data);


    return parseJSON(
        text
    );

}

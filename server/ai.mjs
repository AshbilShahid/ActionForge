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

Keep this below the normal Netlify function timeout.
*/

const AI_TIMEOUT_MS =
    25000;


/* =========================================================
   SYSTEM PROMPT
   ========================================================= */

const SYSTEM_PROMPT = `
You are ActionForge, an AI execution-planning assistant.

Turn the user's goal into a practical execution plan.

IMPORTANT:
- Do NOT browse the web.
- Do NOT perform web searches.
- Do NOT use Google Search.
- Do NOT use external search tools.
- Use only information supplied by the user.
- Make reasonable assumptions when information is missing.

Return ONLY valid JSON.
No Markdown.
No code fences.
No text before or after the JSON.

Use exactly this structure:

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
- estimated_minutes must be an integer.
- Use 5 to 8 tasks normally.
- Keep descriptions concise.
- Keep the entire response compact.
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
- Keep descriptions concise.
- Keep the response compact.

Return ONLY valid JSON.
No Markdown.
No code fences.
No text before or after the JSON.

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

Rules:
- Use 5 to 8 tasks normally.
- Keep descriptions concise.
- Keep the entire response compact.
`;


/* =========================================================
   CALL AI
   ========================================================= */

async function callAI(
    messages,
    maxTokens = 2800
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
                                0.15,

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
   CLEAN AI TEXT
   ========================================================= */

function cleanAIText(
    text
) {

    let cleaned =
        String(text || "").trim();


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


    return cleaned;

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


    const cleaned =
        cleanAIText(text);


    /* -----------------------------------------------------
       Attempt 1: direct JSON
       ----------------------------------------------------- */

    try {

        return JSON.parse(
            cleaned
        );

    }
    catch {
        // Continue.
    }


    /* -----------------------------------------------------
       Attempt 2: JSON object embedded in text
       ----------------------------------------------------- */

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
   VALIDATE PLAN
   ========================================================= */

function validatePlan(
    plan
) {

    if (
        !plan ||
        typeof plan !== "object"
    ) {

        return false;

    }


    if (
        typeof plan.goal !== "string"
    ) {

        return false;

    }


    if (
        !Array.isArray(plan.tasks)
    ) {

        return false;

    }


    return true;

}


/* =========================================================
   VALIDATE REPLAN
   ========================================================= */

function validateReplan(
    result
) {

    if (
        !result ||
        typeof result !== "object"
    ) {

        return false;

    }


    if (
        !validatePlan(
            result.updated_plan
        )
    ) {

        return false;

    }


    if (
        !Array.isArray(
            result.changes
        )
    ) {

        return false;

    }


    return true;

}


/* =========================================================
   GENERATE PLAN RECOVERY
   ========================================================= */

async function recoverPlanJSON(
    originalText
) {

    console.warn(
        "Initial AI response was not valid JSON. Attempting compact recovery."
    );


    const recoveryPrompt = `
The previous AI response was incomplete or invalid JSON.

Reconstruct the ActionForge plan below as VALID JSON.

PREVIOUS RESPONSE:

${String(originalText).slice(0, 12000)}

IMPORTANT:
- Return ONLY JSON.
- Do not use Markdown.
- Do not explain anything.
- Use exactly 5 tasks if possible.
- Keep every task description under 20 words.
- Keep summary and insight concise.
- Do not add unnecessary fields.

Return exactly:

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
                        recoveryPrompt
                }
            ],
            2200
        );


    const text =
        extractText(data);


    const plan =
        parseJSON(text);


    if (
        !validatePlan(plan)
    ) {

        throw new Error(
            "AI returned an invalid execution plan."
        );

    }


    return plan;

}


/* =========================================================
   REPLAN RECOVERY
   ========================================================= */

async function recoverReplanJSON(
    originalText,
    originalPlan,
    problem
) {

    console.warn(
        "Initial replan response was not valid JSON. Attempting compact recovery."
    );


    const recoveryPrompt = `
The previous response was incomplete or invalid JSON.

Rebuild the updated ActionForge plan as valid JSON.

ORIGINAL PLAN:

${JSON.stringify(originalPlan)}

NEW PROBLEM:

${problem}

PREVIOUS RESPONSE:

${String(originalText).slice(0, 12000)}

IMPORTANT:
- Return ONLY JSON.
- Do not use Markdown.
- Preserve the original goal.
- Use 5 tasks if possible.
- Keep descriptions under 20 words.
- Keep changes concise.
- No unnecessary fields.

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
                        recoveryPrompt
                }
            ],
            2200
        );


    const text =
        extractText(data);


    const result =
        parseJSON(text);


    if (
        !validateReplan(result)
    ) {

        throw new Error(
            "AI returned an invalid updated plan."
        );

    }


    return result;

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

Requirements:
- Use 5 to 8 tasks.
- Keep descriptions concise.
- Prioritize the highest-impact actions.
- Return JSON only.
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
            2800
        );


    const text =
        extractText(data);


    try {

        const plan =
            parseJSON(text);


        if (
            !validatePlan(plan)
        ) {

            throw new Error(
                "Invalid plan structure."
            );

        }


        return plan;

    }
    catch {

        /*
        If DeepSeek cut off the response,
        automatically request a compact reconstruction.
        */

        return recoverPlanJSON(
            text
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
        typeof problem !== "string"
    ) {

        throw new Error(
            "Problem description is required."
        );

    }


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
- Keep 5 to 8 tasks.
- Keep descriptions concise.
- Keep "changes" concise.
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
            2800
        );


    const text =
        extractText(data);


    try {

        const result =
            parseJSON(text);


        if (
            !validateReplan(result)
        ) {

            throw new Error(
                "Invalid replan structure."
            );

        }


        return result;

    }
    catch {

        /*
        DeepSeek may occasionally hit its output limit.
        Attempt a compact reconstruction before failing.
        */

        return recoverReplanJSON(
            text,
            originalPlan,
            problem
        );

    }

}

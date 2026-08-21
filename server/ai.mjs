/* =========================================================
   ACTIONFORGE AI ENGINE
   ========================================================= */

const apiKey = process.env.AI_API_KEY;

if (!apiKey) {
    throw new Error("AI_API_KEY is missing from Netlify.");
}

const API_URL =
    "https://api.b.ai/v1/chat/completions";

const MODEL =
    "deepseek-v4-flash";


/* =========================================================
   NORMAL PLAN SYSTEM PROMPT
   ========================================================= */

const SYSTEM_PROMPT = `
You are ActionForge, an AI execution-planning assistant.

Transform the user's goal into a practical and executable plan.

IMPORTANT:
- Do NOT browse the web.
- Do NOT use web search.
- Do NOT use external tools.
- Use ONLY information supplied by the user.
- Make reasonable assumptions when information is missing.

Return JSON only.

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
- IDs must be T1, T2, T3, etc.
- Every task must have a unique ID.
- Dependencies must reference existing IDs.
- critical_path must reference existing IDs.
- estimated_minutes must be an integer.
- Keep the number of tasks reasonable.
- Tasks must be concrete and actionable.
- Keep descriptions concise.
- Return JSON only.
`;


/* =========================================================
   REPLAN SYSTEM PROMPT
   ========================================================= */

const REPLAN_SYSTEM_PROMPT = `
You are ActionForge.

Adapt an existing execution plan based ONLY on the existing plan
and the user's new problem.

Do NOT browse.
Do NOT search the web.
Do NOT use tools.
Do NOT invent external information.

Return ONLY valid JSON.

The output MUST have exactly this structure:

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

STRICT RULES:

- Preserve the original goal.
- Modify only what needs changing.
- Keep useful existing tasks when possible.
- Remove unnecessary tasks only when appropriate.
- Recalculate dependencies.
- Recalculate critical_path.
- Keep tasks concise.
- Use short descriptions.
- Keep the same general number of tasks unless the problem requires otherwise.
- "changes" must contain short strings describing what changed.
- Do not include explanations outside the JSON.
- Return JSON only.
`;


/* =========================================================
   CALL B.AI
   ========================================================= */

async function callAI(
    messages,
    maxTokens = 4000,
    options = {}
) {

    const response =
        await fetch(
            API_URL,
            {
                method: "POST",

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
                            options.temperature ?? 0.2,

                        max_tokens:
                            maxTokens,

                        /*
                         * IMPORTANT
                         *
                         * ActionForge does not need
                         * DeepSeek's reasoning mode.
                         *
                         * Disabling it makes replanning
                         * considerably faster and prevents
                         * unnecessary token consumption.
                         */
                        thinking: {
                            type: "disabled"
                        },

                        /*
                         * Force the model to produce JSON.
                         */
                        response_format: {
                            type: "json_object"
                        }

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
            "NON-JSON B.AI RESPONSE:",
            raw
        );

        throw new Error(
            "AI service returned an invalid API response."
        );
    }


    /*
     * IMPORTANT:
     *
     * Detect token truncation before trying
     * to parse the model's content.
     */

    const finishReason =
        data?.choices?.[0]?.finish_reason;


    if (
        finishReason === "length"
    ) {

        console.error(
            "B.AI OUTPUT WAS TRUNCATED."
        );

        console.error(
            "Usage:",
            JSON.stringify(
                data?.usage || {},
                null,
                2
            )
        );

        throw new Error(
            "AI response was too long. Please try again."
        );
    }


    if (
        finishReason === "insufficient_system_resource"
    ) {

        throw new Error(
            "AI service is temporarily busy. Please try again."
        );
    }


    return data;
}


/* =========================================================
   EXTRACT MODEL TEXT
   ========================================================= */

function extractText(data) {

    const content =
        data?.choices?.[0]?.message?.content;


    /*
     * Normal string response.
     */

    if (
        typeof content === "string" &&
        content.trim()
    ) {

        return content.trim();
    }


    /*
     * Some providers may return an array.
     */

    if (
        Array.isArray(content)
    ) {

        const parts =
            content
                .map(part => {

                    if (
                        typeof part === "string"
                    ) {

                        return part;
                    }


                    if (
                        typeof part?.text === "string"
                    ) {

                        return part.text;
                    }


                    return "";

                })
                .filter(Boolean);


        if (
            parts.length > 0
        ) {

            return parts
                .join("\n")
                .trim();
        }
    }


    console.error(
        "FULL B.AI RESPONSE:",
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

function parseJSON(text) {

    if (
        !text ||
        typeof text !== "string"
    ) {

        throw new Error(
            "AI returned empty JSON."
        );
    }


    let cleaned =
        text.trim();


    /*
     * Remove accidental Markdown fences.
     */

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


    /*
     * Direct JSON.
     */

    try {

        return JSON.parse(
            cleaned
        );

    }
    catch {
        // Continue.
    }


    /*
     * Try extracting the JSON object.
     */

    const start =
        cleaned.indexOf("{");


    const end =
        cleaned.lastIndexOf("}");


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
        "========== RAW AI JSON =========="
    );

    console.error(
        cleaned
    );

    console.error(
        "================================="
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
        typeof goal !== "string" ||
        !goal.trim()
    ) {

        throw new Error(
            "Goal cannot be empty."
        );
    }


    if (
        goal.length > 5000
    ) {

        throw new Error(
            "Goal is too long. Keep it under 5000 characters."
        );
    }


    const prompt = `
Create an ActionForge execution plan.

USER GOAL:

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
                        prompt
                }
            ],
            4000
        );


    const text =
        extractText(
            data
        );


    return parseJSON(
        text
    );
}


/* =========================================================
   CREATE COMPACT PLAN
   ========================================================= */

function createCompactPlan(
    plan
) {

    if (
        !plan ||
        typeof plan !== "object"
    ) {

        return {};
    }


    return {

        goal:
            plan.goal || "",

        summary:
            plan.summary || "",

        deadline:
            plan.deadline || "",

        priority:
            plan.priority || "medium",

        assumptions:
            Array.isArray(
                plan.assumptions
            )
                ? plan.assumptions
                    .slice(0, 5)
                : [],

        tasks:
            Array.isArray(
                plan.tasks
            )
                ? plan.tasks.map(
                    task => ({
                        id:
                            task.id,

                        title:
                            task.title,

                        description:
                            task.description,

                        priority:
                            task.priority,

                        estimated_minutes:
                            task.estimated_minutes,

                        dependencies:
                            Array.isArray(
                                task.dependencies
                            )
                                ? task.dependencies
                                : []
                    })
                )
                : [],

        critical_path:
            Array.isArray(
                plan.critical_path
            )
                ? plan.critical_path
                : [],

        insight:
            plan.insight || ""

    };
}


/* =========================================================
   REPLAN
   ========================================================= */

export async function replan(
    originalPlan,
    problem
) {

    if (
        !originalPlan
    ) {

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


    /*
     * IMPORTANT:
     *
     * Do NOT send unnecessary data to the model.
     *
     * The previous implementation sent the entire
     * formatted plan plus a large instruction block.
     *
     * This version sends only the fields ActionForge
     * actually needs.
     */

    const compactPlan =
        createCompactPlan(
            originalPlan
        );


    const prompt = `
Adapt this ActionForge plan.

EXISTING PLAN:

${JSON.stringify(
    compactPlan
)}

NEW PROBLEM:

${problem.trim()}

Make the minimum practical changes necessary.

Return JSON only.

Remember:
- Preserve the original goal.
- Keep useful tasks.
- Modify affected tasks.
- Recalculate dependencies.
- Recalculate critical_path.
- Keep descriptions short.
- Keep the plan concise.
- Explain the important changes in "changes".
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
                        prompt
                }
            ],

            /*
             * Enough room for a complete plan,
             * while avoiding an unnecessarily
             * huge generation.
             */

            5000,

            {
                temperature: 0.1
            }
        );


    const text =
        extractText(
            data
        );


    return parseJSON(
        text
    );
}

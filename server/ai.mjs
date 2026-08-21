/* =========================================================
   ACTIONFORGE AI ENGINE
   ========================================================= */

const apiKey = process.env.AI_API_KEY;

if (!apiKey) {
    throw new Error("AI_API_KEY is missing.");
}

const API_URL =
    "https://api.b.ai/v1/chat/completions";

const MODEL =
    "deepseek-v4-flash";


/* =========================================================
   TIMEOUT
   =========================================================

   Netlify currently allows synchronous functions up to
   60 seconds.

   We leave a small safety margin.
*/

const AI_TIMEOUT_MS = 50000;


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

Return ONLY a JSON object.

Required structure:

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
- Keep the number of tasks reasonable.
- Do not create unnecessary tasks.
`;


/* =========================================================
   REPLAN PROMPT
   ========================================================= */

const REPLAN_SYSTEM_PROMPT = `
You are ActionForge, an AI execution-planning assistant.

Your job is to adapt an existing execution plan when reality changes.

IMPORTANT:
- Do NOT browse the web.
- Do NOT perform web searches.
- Do NOT use Google Search.
- Do NOT use external search tools.
- Use only the existing plan and the user's new information.
- Preserve the original goal.
- Keep the plan practical.
- Keep the number of tasks reasonable.
- Modify only what actually needs to change.

Return ONLY a JSON object.

Required structure:

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
- Keep task IDs valid.
- Dependencies must reference existing task IDs.
- critical_path must reference existing task IDs.
- estimated_minutes must be an integer.
- Keep changes concise.
- Do not rewrite the entire plan unnecessarily.
`;


/* =========================================================
   CALL AI
   ========================================================= */

async function callAI(
    messages,
    maxTokens = 2500
) {

    const controller =
        new AbortController();


    const timeout =
        setTimeout(
            () => controller.abort(),
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
                                0.1,

                            max_tokens:
                                maxTokens,

                            /*
                             * IMPORTANT:
                             *
                             * Ask the API itself to produce
                             * JSON instead of relying only
                             * on prompt instructions.
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


        /* =================================================
           API ERROR
           ================================================= */

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


            if (
                response.status === 429
            ) {

                throw new Error(
                    "AI service rate limit reached. Please try again shortly."
                );

            }


            throw new Error(
                `AI service returned ${response.status}.`
            );

        }


        /* =================================================
           PARSE API RESPONSE
           ================================================= */

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
                "AI service returned an invalid response."
            );

        }


        return data;

    }
    catch (error) {

        if (
            error?.name === "AbortError"
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

function extractText(data) {

    /*
     * Standard B.AI / OpenAI-compatible response.
     */

    if (
        data?.choices?.[0]?.message
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


    /*
     * Compatibility with other response formats.
     */

    if (
        typeof data?.output_text === "string" &&
        data.output_text.trim()
    ) {

        return data.output_text.trim();

    }


    if (
        Array.isArray(data?.output)
    ) {

        for (
            const item of data.output
        ) {

            if (
                !Array.isArray(
                    item?.content
                )
            ) {

                continue;

            }


            for (
                const content
                of item.content
            ) {

                if (
                    typeof content?.text ===
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

function parseJSON(text) {

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
     * Direct parse.
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
     * Attempt to locate an object.
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
            "Goal is too long."
        );

    }


    const userPrompt = `
Create an ActionForge execution plan for this goal:

${goal.trim()}

Return only the required JSON object.
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

            2500
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
        typeof problem !== "string" ||
        !problem.trim()
    ) {

        throw new Error(
            "Problem description is required."
        );

    }


    /*
     * Only send the information the AI actually needs.
     *
     * This reduces the input size and therefore makes
     * adaptation faster.
     */

    const compactPlan = {

        goal:
            originalPlan.goal,

        summary:
            originalPlan.summary,

        deadline:
            originalPlan.deadline,

        priority:
            originalPlan.priority,

        assumptions:
            originalPlan.assumptions || [],

        tasks:
            Array.isArray(
                originalPlan.tasks
            )
                ? originalPlan.tasks
                : [],

        critical_path:
            Array.isArray(
                originalPlan.critical_path
            )
                ? originalPlan.critical_path
                : [],

        insight:
            originalPlan.insight

    };


    const userPrompt = `
EXISTING PLAN:

${JSON.stringify(
    compactPlan
)}

NEW PROBLEM:

${problem.trim()}

Adapt the existing plan.

Do the following:

1. Preserve the original goal.
2. Identify what changed.
3. Modify affected tasks.
4. Reorder tasks if necessary.
5. Fix dependencies if necessary.
6. Recalculate the critical path.
7. Decide whether the deadline is still realistic.
8. Keep unaffected tasks where possible.
9. Return concise changes.
10. Return only JSON.
`;


    /*
     * Replanning gets a smaller output budget than
     * initial generation because it should modify,
     * not endlessly regenerate.
     */

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

            2200
        );


    const text =
        extractText(data);


    return parseJSON(
        text
    );

}

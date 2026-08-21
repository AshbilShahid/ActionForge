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


/* =========================================================
   TIMEOUT
   ========================================================= */

const AI_TIMEOUT_MS =
    50000;


/* =========================================================
   RETRY SETTINGS
   ========================================================= */

const MAX_RETRIES =
    2;

const RETRY_DELAY_MS =
    1200;


/* =========================================================
   SYSTEM PROMPT
   ========================================================= */

const SYSTEM_PROMPT = `
You are ActionForge, an AI execution-planning assistant.

Turn a user's goal into a practical execution plan.

IMPORTANT:
- Do NOT browse the web.
- Do NOT perform web searches.
- Do NOT use Google Search.
- Do NOT use external search tools.
- Use only information supplied by the user.
- Make reasonable assumptions when information is missing.

Return ONLY a JSON object.
Do not use Markdown.
Do not use code fences.
Do not add text before or after the JSON.

Use this exact structure:

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
`;


/* =========================================================
   REPLAN SYSTEM PROMPT
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
- Modify only what needs to change.

Return ONLY a JSON object.

Use exactly this structure:

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
`;


/* =========================================================
   WAIT HELPER
   ========================================================= */

function sleep(ms) {

    return new Promise(
        resolve => setTimeout(
            resolve,
            ms
        )
    );

}


/* =========================================================
   CALL AI
   ========================================================= */

async function callAI(
    messages,
    maxTokens = 2500
) {

    let lastError = null;


    for (
        let attempt = 1;
        attempt <= MAX_RETRIES;
        attempt++
    ) {

        try {

            console.log(
                `B.AI request attempt ${attempt}/${MAX_RETRIES}`
            );


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

                                    response_format:
                                        {
                                            type:
                                                "json_object"
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


                /* =========================================
                   HTTP ERROR
                   ========================================= */

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
                            "AI service timed out."
                        );

                    }


                    if (
                        response.status === 429
                    ) {

                        throw new Error(
                            "AI service rate limit reached."
                        );

                    }


                    throw new Error(
                        `AI service returned ${response.status}.`
                    );

                }


                /* =========================================
                   PARSE API RESPONSE
                   ========================================= */

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


                /* =========================================
                   CHECK FOR USABLE MODEL TEXT
                   ========================================= */

                const text =
                    extractText(
                        data
                    );


                /*
                 * IMPORTANT:
                 *
                 * If the API technically succeeded but
                 * returned no content, treat that as a
                 * retryable failure.
                 */

                if (
                    !text ||
                    !text.trim()
                ) {

                    throw new Error(
                        "AI returned no usable text."
                    );

                }


                /*
                 * Validate JSON before returning.
                 *
                 * This prevents malformed responses from
                 * reaching the frontend.
                 */

                parseJSON(
                    text
                );


                return data;

            }
            finally {

                clearTimeout(
                    timeout
                );

            }

        }
        catch (error) {

            lastError =
                error;


            console.error(
                `B.AI attempt ${attempt} failed:`,
                error?.message
            );


            /*
             * Do not retry authentication or configuration
             * errors. Those will not magically fix themselves.
             */

            const message =
                String(
                    error?.message || ""
                ).toLowerCase();


            const permanentError =
                message.includes(
                    "401"
                ) ||
                message.includes(
                    "403"
                ) ||
                message.includes(
                    "api key"
                ) ||
                message.includes(
                    "authentication"
                ) ||
                message.includes(
                    "rate limit"
                );


            if (
                permanentError
            ) {

                throw error;

            }


            /*
             * Retry if another attempt remains.
             */

            if (
                attempt < MAX_RETRIES
            ) {

                await sleep(
                    RETRY_DELAY_MS
                );

            }

        }

    }


    /*
     * All attempts failed.
     */

    if (
        lastError?.message
    ) {

        throw lastError;

    }


    throw new Error(
        "AI request failed after multiple attempts."
    );

}


/* =========================================================
   EXTRACT TEXT
   ========================================================= */

function extractText(
    data
) {

    /*
     * Standard OpenAI-compatible response.
     */

    const message =
        data?.choices?.[0]?.message;


    if (
        message
    ) {

        /*
         * Normal string response.
         */

        if (
            typeof message.content ===
                "string" &&
            message.content.trim()
        ) {

            return message.content.trim();

        }


        /*
         * Some providers may return content
         * as an array of content blocks.
         */

        if (
            Array.isArray(
                message.content
            )
        ) {

            const parts = [];


            for (
                const part
                of message.content
            ) {

                if (
                    typeof part ===
                        "string"
                ) {

                    parts.push(
                        part
                    );

                }
                else if (
                    typeof part?.text ===
                        "string"
                ) {

                    parts.push(
                        part.text
                    );

                }

            }


            const combined =
                parts
                    .join("")
                    .trim();


            if (
                combined
            ) {

                return combined;

            }

        }


        /*
         * Some APIs may expose reasoning/content
         * separately.
         */

        if (
            typeof message.reasoning_content ===
                "string" &&
            message.reasoning_content.trim()
        ) {

            /*
             * Do NOT normally use reasoning as the final
             * answer, but keep this available as a fallback
             * if it itself contains JSON.
             */

            const reasoning =
                message.reasoning_content.trim();


            if (
                reasoning.startsWith("{") &&
                reasoning.endsWith("}")
            ) {

                return reasoning;

            }

        }

    }


    /*
     * Responses API compatibility.
     */

    if (
        typeof data?.output_text ===
            "string" &&
        data.output_text.trim()
    ) {

        return data.output_text.trim();

    }


    /*
     * Generic output compatibility.
     */

    if (
        Array.isArray(
            data?.output
        )
    ) {

        for (
            const item
            of data.output
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


    return null;

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
            "AI returned invalid JSON."
        );

    }


    let cleaned =
        text.trim();


    /*
     * Remove Markdown fences if the model
     * accidentally adds them.
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
     * Direct JSON parse.
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
     * Find JSON object inside surrounding text.
     */

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
        extractText(
            data
        );


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
     * Only send information needed for adaptation.
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
EXISTING ACTIONFORGE PLAN:

${JSON.stringify(
    compactPlan
)}

NEW PROBLEM:

${problem.trim()}

Adapt this plan.

Requirements:

- Preserve the original goal.
- Identify what changed.
- Modify affected tasks.
- Reorder tasks if necessary.
- Fix dependencies if necessary.
- Recalculate the critical path.
- Decide whether the deadline remains realistic.
- Keep unaffected tasks where possible.
- Keep changes concise.
- Return ONLY JSON.
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
            2200
        );


    const text =
        extractText(
            data
        );


    return parseJSON(
        text
    );

}

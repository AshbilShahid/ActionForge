/* =========================================================
   ACTIONFORGE AI ENGINE
   DeepSeek V4 Flash / B.AI
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
   NORMAL PLAN PROMPT
   ========================================================= */

const SYSTEM_PROMPT = `
You are ActionForge, an AI execution-planning assistant.

Transform the user's goal into a practical execution plan.

Do not browse.
Do not search.
Do not use tools.
Use only information supplied by the user.
Make reasonable assumptions when information is missing.

Return ONLY JSON.

Structure:

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
- Use unique task IDs.
- IDs must be T1, T2, T3, etc.
- Dependencies must reference existing IDs.
- critical_path must reference existing IDs.
- estimated_minutes must be an integer.
- Keep the number of tasks reasonable.
`;


/* =========================================================
   REPLAN PROMPT
   ========================================================= */

const REPLAN_SYSTEM_PROMPT = `
You are ActionForge.

You modify an existing execution plan after something changes.

Do not browse.
Do not search.
Do not use tools.

Use ONLY:
1. the existing plan
2. the user's new problem

Preserve the original goal.

IMPORTANT:
Return ONLY a JSON object.
Do not return Markdown.
Do not return explanations outside the JSON.

Return:

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
`;


/* =========================================================
   CALL B.AI
   ========================================================= */

async function callAI(
    systemPrompt,
    userPrompt,
    maxTokens
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
                        "application/json",

                    "Accept":
                        "application/json"
                },

                body:
                    JSON.stringify({

                        model:
                            MODEL,

                        messages: [
                            {
                                role: "system",
                                content:
                                    systemPrompt
                            },
                            {
                                role: "user",
                                content:
                                    userPrompt
                            }
                        ],

                        temperature:
                            0.1,

                        max_tokens:
                            maxTokens

                    })
            }
        );


    const raw =
        await response.text();


    console.log(
        "B.AI STATUS:",
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
            "B.AI RAW RESPONSE:",
            raw
        );

        throw new Error(
            "B.AI returned invalid API data."
        );
    }


    /*
     * VERY IMPORTANT:
     *
     * Log the structure, not the API key.
     */

    console.log(
        "B.AI RESPONSE STRUCTURE:",
        JSON.stringify(
            {
                id: data?.id,
                model: data?.model,
                finish_reason:
                    data?.choices?.[0]?.finish_reason,
                has_choices:
                    Array.isArray(data?.choices),
                choice_count:
                    data?.choices?.length || 0
            }
        )
    );


    return data;
}


/* =========================================================
   EXTRACT TEXT
   ========================================================= */

function extractText(data) {

    /*
     * -----------------------------------------------------
     * 1. Standard Chat Completions response
     * -----------------------------------------------------
     */

    const message =
        data?.choices?.[0]?.message;


    if (
        typeof message?.content ===
        "string"
    ) {

        if (
            message.content.trim()
        ) {

            return message.content.trim();
        }
    }


    /*
     * -----------------------------------------------------
     * 2. Content array
     * -----------------------------------------------------
     */

    if (
        Array.isArray(
            message?.content
        )
    ) {

        const parts =
            message.content
                .map(item => {

                    if (
                        typeof item ===
                        "string"
                    ) {
                        return item;
                    }

                    if (
                        typeof item?.text ===
                        "string"
                    ) {
                        return item.text;
                    }

                    if (
                        typeof item?.content ===
                        "string"
                    ) {
                        return item.content;
                    }

                    return "";

                })
                .filter(Boolean);


        if (
            parts.length
        ) {

            return parts
                .join("")
                .trim();
        }
    }


    /*
     * -----------------------------------------------------
     * 3. Direct output_text
     * -----------------------------------------------------
     */

    if (
        typeof data?.output_text ===
        "string"
    ) {

        if (
            data.output_text.trim()
        ) {

            return data.output_text.trim();
        }
    }


    /*
     * -----------------------------------------------------
     * 4. Output array
     * -----------------------------------------------------
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
                typeof item?.text ===
                "string" &&
                item.text.trim()
            ) {

                return item.text.trim();
            }


            if (
                Array.isArray(
                    item?.content
                )
            ) {

                for (
                    const part
                    of item.content
                ) {

                    if (
                        typeof part ===
                        "string" &&
                        part.trim()
                    ) {

                        return part.trim();
                    }


                    if (
                        typeof part?.text ===
                        "string" &&
                        part.text.trim()
                    ) {

                        return part.text.trim();
                    }
                }
            }
        }
    }


    /*
     * -----------------------------------------------------
     * 5. Some compatible APIs put text directly
     * -----------------------------------------------------
     */

    if (
        typeof data?.text ===
        "string"
    ) {

        if (
            data.text.trim()
        ) {

            return data.text.trim();
        }
    }


    /*
     * -----------------------------------------------------
     * NOTHING FOUND
     * -----------------------------------------------------
     */

    console.error(
        "========== NO AI TEXT =========="
    );

    console.error(
        JSON.stringify(
            data,
            null,
            2
        )
    );

    console.error(
        "================================"
    );


    /*
     * Include finish reason in the error.
     * This is extremely useful if DeepSeek
     * stopped because of token limits.
     */

    const finishReason =
        data?.choices?.[0]?.finish_reason;


    if (
        finishReason
    ) {

        throw new Error(
            `AI returned no usable text. Finish reason: ${finishReason}`
        );
    }


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
     * Remove code fences.
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
     * Extract JSON object.
     */

    const start =
        cleaned.indexOf("{");

    const end =
        cleaned.lastIndexOf("}");


    if (
        start !== -1 &&
        end > start
    ) {

        try {

            return JSON.parse(
                cleaned.substring(
                    start,
                    end + 1
                )
            );

        }
        catch {
            // Continue.
        }
    }


    console.error(
        "INVALID AI JSON:"
    );

    console.error(
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


    const prompt = `
Create an ActionForge execution plan.

GOAL:
${goal.trim()}

Return JSON only.
`;


    const data =
        await callAI(
            SYSTEM_PROMPT,
            prompt,
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
     * Keep the plan compact.
     *
     * We intentionally do NOT send unnecessary
     * fields or repeated descriptions.
     */

    const compactPlan = {

        goal:
            originalPlan.goal || "",

        summary:
            originalPlan.summary || "",

        deadline:
            originalPlan.deadline || "",

        priority:
            originalPlan.priority || "medium",

        tasks:
            Array.isArray(
                originalPlan.tasks
            )
                ? originalPlan.tasks.map(
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
                            task.dependencies || []

                    })
                )
                : [],

        critical_path:
            originalPlan.critical_path || [],

        insight:
            originalPlan.insight || ""

    };


    const prompt = `
ADAPT THIS ACTIONFORGE PLAN:

${JSON.stringify(
    compactPlan
)}

USER'S NEW PROBLEM:

${problem.trim()}

Make the minimum necessary changes.

Return:
- the updated plan
- a short list of changes

Return JSON only.
`;


    /*
     * REPLAN GETS A SMALLER OUTPUT.
     *
     * This is deliberate.
     */

    const data =
        await callAI(
            REPLAN_SYSTEM_PROMPT,
            prompt,
            1800
        );


    const text =
        extractText(data);


    const result =
        parseJSON(text);


    /*
     * Basic validation.
     */

    if (
        !result?.updated_plan
    ) {

        throw new Error(
            "AI returned no updated plan."
        );
    }


    if (
        !Array.isArray(
            result.updated_plan.tasks
        )
    ) {

        throw new Error(
            "AI returned an invalid updated plan."
        );
    }


    if (
        !Array.isArray(
            result.changes
        )
    ) {

        result.changes = [];
    }


    return result;
}

/* =========================================================
   ACTIONFORGE AI ENGINE
   DeepSeek V4 Flash + B.AI
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

Turn the user's goal into a practical, realistic and executable plan.

IMPORTANT:
- Do not browse the web.
- Do not perform web searches.
- Do not use Google Search.
- Do not use external tools.
- Use only information supplied by the user.
- If information is missing, make reasonable assumptions.
- Never invent external facts.

Return ONLY JSON.

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
- Every task must have a unique ID.
- IDs must be T1, T2, T3, etc.
- Dependencies must reference existing task IDs.
- critical_path must reference existing task IDs.
- estimated_minutes must be an integer.
- Keep the number of tasks reasonable.
- Tasks must be concrete and actionable.
`;


/* =========================================================
   REPLAN SYSTEM PROMPT
   ========================================================= */

const REPLAN_SYSTEM_PROMPT = `
You are ActionForge.

You adapt an existing execution plan when the user's situation changes.

Do not browse the web.
Do not search.
Do not use tools.
Use only the existing plan and the new problem.

Preserve the original goal.

Return ONLY valid JSON.

Return exactly this structure:

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
- Preserve the original goal.
- Keep the number of tasks reasonable.
- Every task must have a unique ID.
- Dependencies must reference existing task IDs.
- critical_path must reference existing task IDs.
- estimated_minutes must be an integer.
- changes must contain short explanations of what changed.
`;


/* =========================================================
   RAW B.AI REQUEST
   ========================================================= */

async function callAI(
    systemPrompt,
    userPrompt,
    maxTokens = 3000
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

                        temperature: 0.1,

                        max_tokens:
                            maxTokens,

                        /*
                         * IMPORTANT:
                         *
                         * Ask B.AI for a JSON object directly.
                         * This greatly reduces malformed
                         * adaptation responses.
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
            "B.AI NON-JSON RESPONSE:",
            raw
        );

        throw new Error(
            "B.AI returned a non-JSON response."
        );
    }


    return data;
}


/* =========================================================
   EXTRACT AI TEXT
   ========================================================= */

function extractText(data) {

    /*
     * Standard B.AI / OpenAI-compatible format.
     */

    const content =
        data?.choices?.[0]?.message?.content;


    if (
        typeof content === "string" &&
        content.trim()
    ) {

        return content.trim();
    }


    /*
     * Some providers can return content
     * as an array.
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
                        typeof part?.text ===
                        "string"
                    ) {
                        return part.text;
                    }

                    return "";

                })
                .filter(Boolean);


        if (parts.length > 0) {

            return parts
                .join("\n")
                .trim();
        }
    }


    /*
     * Defensive fallback.
     */

    if (
        typeof data?.output_text ===
        "string" &&
        data.output_text.trim()
    ) {

        return data.output_text.trim();
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
            "AI returned an empty response."
        );
    }


    let cleaned =
        text.trim();


    /*
     * Remove Markdown fences if the model
     * unexpectedly adds them.
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
     * First attempt:
     * direct JSON.
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
     * Second attempt:
     * extract the JSON object.
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
        "========== INVALID AI JSON =========="
    );

    console.error(
        cleaned
    );

    console.error(
        "======================================"
    );


    throw new Error(
        "AI returned invalid JSON."
    );
}


/* =========================================================
   VALIDATE PLAN
   ========================================================= */

function validatePlan(plan) {

    if (
        !plan ||
        typeof plan !== "object"
    ) {

        throw new Error(
            "AI returned an invalid plan."
        );
    }


    if (
        typeof plan.goal !== "string"
    ) {

        throw new Error(
            "AI returned an invalid goal."
        );
    }


    if (
        !Array.isArray(plan.tasks)
    ) {

        throw new Error(
            "AI returned an invalid task list."
        );
    }


    return plan;
}


/* =========================================================
   VALIDATE REPLAN
   ========================================================= */

function validateReplan(result) {

    if (
        !result ||
        typeof result !== "object"
    ) {

        throw new Error(
            "AI returned an invalid adaptation."
        );
    }


    if (
        !result.updated_plan ||
        typeof result.updated_plan !==
        "object"
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
            "AI returned an invalid updated task list."
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
Create an ActionForge execution plan for this goal:

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


    const plan =
        parseJSON(text);


    return validatePlan(plan);
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
     * Do NOT send unnecessary data.
     *
     * Only send the information ActionForge
     * actually needs to modify the plan.
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

        assumptions:
            Array.isArray(
                originalPlan.assumptions
            )
                ? originalPlan.assumptions
                : [],

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
                originalPlan.critical_path
            )
                ? originalPlan.critical_path
                : [],

        insight:
            originalPlan.insight || ""

    };


    /*
     * Keep the adaptation prompt short.
     */

    const prompt = `
EXISTING PLAN:

${JSON.stringify(compactPlan)}

USER'S NEW PROBLEM:

${problem.trim()}

Adapt the existing plan.

Preserve the original goal.

Only change what is necessary.

Update:
- affected tasks
- task order
- dependencies
- deadline if necessary
- critical path
- priority if necessary
- immediate focus

Put a short explanation of each important modification
inside the "changes" array.

Return JSON only.
`;


    /*
     * Smaller response = faster adaptation.
     */

    const data =
        await callAI(
            REPLAN_SYSTEM_PROMPT,
            prompt,
            2200
        );


    const text =
        extractText(data);


    const result =
        parseJSON(text);


    return validateReplan(
        result
    );
}

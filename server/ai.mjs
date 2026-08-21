const apiKey = process.env.AI_API_KEY;

if (!apiKey) {
    throw new Error("AI_API_KEY is missing from Netlify.");
}

const API_URL = "https://api.b.ai/v1/chat/completions";
const MODEL = "deepseek-v4-flash";


/* =========================================================
   NORMAL PLAN SYSTEM PROMPT
   ========================================================= */

const SYSTEM_PROMPT = `
You are ActionForge, an AI execution-planning assistant.

Your job is to transform a user's goal into a practical,
realistic and executable action plan.

IMPORTANT:
- Do NOT browse the web.
- Do NOT perform web searches.
- Do NOT use Google Search.
- Do NOT use external search tools.
- Do NOT use tools.
- Use ONLY information supplied by the user.
- If information is missing, make reasonable assumptions.
- Never invent external facts.

Return ONLY valid JSON.
Do not use Markdown.
Do not use code fences.
Do not add text before or after the JSON.

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
- Prioritize actions that directly move the user toward their goal.
- Do not add information that requires web research.
`;


/* =========================================================
   REPLAN SYSTEM PROMPT
   ========================================================= */

const REPLAN_SYSTEM_PROMPT = `
You are ActionForge, an AI execution-planning assistant.

Your job is to adapt an existing execution plan when reality changes.

IMPORTANT:
- Do NOT browse the web.
- Do NOT perform web searches.
- Do NOT use Google Search.
- Do NOT use external search tools.
- Do NOT use tools.
- Use ONLY the existing plan and the user's new information.
- Preserve the original goal.
- Keep the response practical.
- Never invent external facts.

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

Rules:
- Keep the number of tasks reasonable.
- Every task must have a unique ID.
- Dependencies must reference existing task IDs.
- critical_path must reference existing task IDs.
- estimated_minutes must be an integer.
- Keep descriptions concise.
- Keep "changes" concise.
`;


/* =========================================================
   CALL B.AI
   ========================================================= */

async function callAI(
    messages,
    systemPrompt = SYSTEM_PROMPT,
    maxTokens = 4000
) {

    const response = await fetch(API_URL, {

        method: "POST",

        headers: {
            "Authorization": `Bearer ${apiKey.trim()}`,
            "Content-Type": "application/json"
        },

        body: JSON.stringify({

            model: MODEL,

            messages: [
                {
                    role: "system",
                    content: systemPrompt
                },
                ...messages
            ],

            temperature: 0.2,

            max_tokens: maxTokens

        })

    });


    const raw = await response.text();


    console.log(
        "B.AI status:",
        response.status
    );


    if (!response.ok) {

        console.error(
            "B.AI error:",
            raw
        );

        throw new Error(
            `${response.status} ${raw}`
        );

    }


    let data;

    try {

        data = JSON.parse(raw);

    } catch {

        console.error(
            "B.AI returned non-JSON:",
            raw
        );

        throw new Error(
            "B.AI returned a non-JSON API response."
        );

    }


    return data;
}


/* =========================================================
   EXTRACT MODEL TEXT
   ========================================================= */

function extractText(data) {

    /*
     * Standard OpenAI-compatible response.
     */

    if (
        typeof data?.choices?.[0]?.message?.content ===
        "string"
    ) {

        const content =
            data.choices[0]
                .message
                .content
                .trim();


        if (content) {
            return content;
        }

    }


    /*
     * Some providers return content as an array.
     */

    if (
        Array.isArray(
            data?.choices?.[0]?.message?.content
        )
    ) {

        const parts =
            data.choices[0]
                .message
                .content
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


    /*
     * Alternate output_text format.
     */

    if (
        typeof data?.output_text === "string" &&
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
     * Remove Markdown fences.
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

    } catch {
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

        } catch {
            // Continue.
        }

    }


    console.error(
        "========== RAW AI RESPONSE =========="
    );

    console.error(
        cleaned
    );

    console.error(
        "======================================"
    );


    throw new Error(
        "RAW_AI_RESPONSE::" +
        cleaned
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
Create an ActionForge execution plan for this goal:

${goal.trim()}

Remember:

- Do not browse the web.
- Do not perform web searches.
- Do not use Google Search.
- Do not use external tools.
- Use only the user's information.
- Make reasonable assumptions when necessary.
- Return JSON only.
`;


    const data =
        await callAI(
            [
                {
                    role: "user",
                    content: prompt
                }
            ],
            SYSTEM_PROMPT,
            4000
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
     * IMPORTANT PERFORMANCE OPTIMIZATION
     *
     * Do not send unnecessary information back to the AI.
     *
     * We keep the information that is actually needed to
     * reconstruct the plan but keep the request compact.
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
            Array.isArray(originalPlan.assumptions)
                ? originalPlan.assumptions
                : [],

        tasks:
            Array.isArray(originalPlan.tasks)
                ? originalPlan.tasks.map(task => ({

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
                        Array.isArray(task.dependencies)
                            ? task.dependencies
                            : []

                }))
                : [],

        critical_path:
            Array.isArray(originalPlan.critical_path)
                ? originalPlan.critical_path
                : [],

        insight:
            originalPlan.insight || ""

    };


    const prompt = `
Adapt this ActionForge execution plan.

EXISTING PLAN:

${JSON.stringify(
    compactPlan
)}


NEW PROBLEM:

${problem.trim()}


Instructions:

- Preserve the original goal.
- Adapt the plan to the new problem.
- Remove unnecessary tasks if appropriate.
- Modify tasks if necessary.
- Reorder tasks if necessary.
- Update dependencies.
- Recalculate the critical path.
- Determine whether the deadline is still realistic.
- Keep task descriptions concise.
- Explain the important changes briefly.
- Return ONLY valid JSON.
`;


    /*
     * Replan uses a smaller maximum output.
     *
     * This reduces response time while still giving
     * DeepSeek enough room to return the complete plan.
     */

    const data =
        await callAI(
            [
                {
                    role: "user",
                    content: prompt
                }
            ],
            REPLAN_SYSTEM_PROMPT,
            3000
        );


    const text =
        extractText(data);


    return parseJSON(
        text
    );

}

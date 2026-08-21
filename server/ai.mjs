/* =========================================================
   ACTIONFORGE AI ENGINE
   ========================================================= */

const apiKey = process.env.AI_API_KEY;

if (!apiKey) {
    throw new Error(
        "AI_API_KEY is missing from Netlify."
    );
}

const API_URL =
    "https://api.b.ai/v1/chat/completions";

const MODEL =
    "deepseek-v4-flash";


/* =========================================================
   SYSTEM PROMPT
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
You are ActionForge.

Adapt the existing execution plan using the user's
new situation.

Do not browse the web.
Do not use tools.
Use only the existing plan and the new situation.

Preserve the original goal.

Make only the changes that are necessary.

Return ONLY valid JSON.

No Markdown.
No code fences.
No explanation outside JSON.

Return:

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
   RAW B.AI REQUEST
   ========================================================= */

async function requestAI(
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
                            0.2,

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


    /*
    Never hide the raw response while debugging.
    */

    if (!response.ok) {

        console.error(
            "========== B.AI ERROR =========="
        );

        console.error(
            raw
        );

        console.error(
            "================================"
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
            "B.AI returned invalid API JSON:"
        );

        console.error(
            raw
        );

        throw new Error(
            "B.AI returned an invalid API response."
        );
    }


    return data;
}


/* =========================================================
   EXTRACT MODEL TEXT
   ========================================================= */

function extractText(data) {

    /*
    =========================================================
    FORMAT 1
    Standard OpenAI-compatible response
    =========================================================
    */

    const standard =
        data?.choices?.[0]?.message?.content;


    if (
        typeof standard === "string" &&
        standard.trim()
    ) {

        return standard.trim();

    }


    /*
    =========================================================
    FORMAT 2
    Content returned as an array
    =========================================================
    */

    if (
        Array.isArray(
            standard
        )
    ) {

        const parts =
            standard
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
            parts.length
        ) {

            return parts
                .join("")
                .trim();

        }

    }


    /*
    =========================================================
    FORMAT 3
    Some APIs expose output_text
    =========================================================
    */

    if (
        typeof data?.output_text === "string" &&
        data.output_text.trim()
    ) {

        return data.output_text.trim();

    }


    /*
    =========================================================
    FORMAT 4
    Alternative output structure
    =========================================================
    */

    if (
        Array.isArray(
            data?.output
        )
    ) {

        const parts = [];


        for (
            const item
            of data.output
        ) {

            if (
                typeof item?.text === "string"
            ) {

                parts.push(
                    item.text
                );

            }


            if (
                Array.isArray(
                    item?.content
                )
            ) {

                for (
                    const content
                    of item.content
                ) {

                    if (
                        typeof content?.text === "string"
                    ) {

                        parts.push(
                            content.text
                        );

                    }

                }

            }

        }


        if (
            parts.length
        ) {

            return parts
                .join("")
                .trim();

        }

    }


    /*
    =========================================================
    NO TEXT
    =========================================================

    IMPORTANT:
    Print the complete response so we can identify exactly
    what DeepSeek returned if this ever happens again.
    */

    console.error(
        "========== AI RESPONSE WITHOUT TEXT =========="
    );

    console.error(
        JSON.stringify(
            data,
            null,
            2
        )
    );

    console.error(
        "==============================================="
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
    Remove Markdown fences.
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
    Direct JSON.
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
    Extract JSON object from surrounding text.
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
   CALL AI WITH RETRY
   ========================================================= */

async function callAI(
    systemPrompt,
    userPrompt,
    maxTokens = 4000,
    allowRetry = true
) {

    try {

        const data =
            await requestAI(
                systemPrompt,
                userPrompt,
                maxTokens
            );


        const text =
            extractText(data);


        return text;

    }
    catch (error) {

        console.error(
            "AI REQUEST ERROR:",
            error?.message
        );


        /*
        =====================================================
        ONE AUTOMATIC RETRY
        =====================================================

        This specifically helps with transient responses where
        B.AI successfully receives the request but DeepSeek
        returns an empty content field.

        We only retry once.
        */

        if (
            allowRetry
        ) {

            console.log(
                "Retrying ActionForge AI request..."
            );


            await new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        800
                    )
            );


            return callAI(
                systemPrompt,
                userPrompt,
                maxTokens,
                false
            );

        }


        throw error;

    }

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
Create an ActionForge execution plan for this goal:

${goal.trim()}

Return JSON only.
`;


    const text =
        await callAI(
            SYSTEM_PROMPT,
            prompt,
            4000
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
    =========================================================
    COMPACT EXISTING PLAN
    =========================================================
    */

    const existingPlan =
        JSON.stringify(
            originalPlan
        );


    /*
    =========================================================
    COMPACT REPLAN PROMPT
    =========================================================

    Keep this deliberately short.

    The existing plan already contains all the structure
    DeepSeek needs, so there is no reason to repeat the full
    specification several times.
    */

    const prompt = `
EXISTING PLAN:
${existingPlan}

NEW SITUATION:
${problem.trim()}

Adapt the plan.

Requirements:

- Preserve the original goal.
- Keep useful tasks.
- Modify only what is necessary.
- Add tasks only when necessary.
- Remove tasks only when necessary.
- Reorder tasks if needed.
- Update dependencies.
- Update the critical path.
- Keep the deadline realistic.
- Explain important changes in "changes".
- Return ONLY valid JSON.
- No Markdown.
- No code fences.
- No explanation outside JSON.
`;


    /*
    =========================================================
    AI REQUEST
    =========================================================

    2500 tokens should be enough for the structured
    adaptation response.
    */

    const text =
        await callAI(
            REPLAN_SYSTEM_PROMPT,
            prompt,
            2500,
            true
        );


    /*
    =========================================================
    PARSE
    =========================================================
    */

    const result =
        parseJSON(
            text
        );


    /*
    =========================================================
    VALIDATE
    =========================================================
    */

    if (
        !result ||
        typeof result !== "object"
    ) {

        throw new Error(
            "AI returned an invalid adaptation."
        );

    }


    if (
        !result.updated_plan
    ) {

        throw new Error(
            "AI adaptation did not contain an updated plan."
        );

    }


    if (
        !Array.isArray(
            result.updated_plan.tasks
        )
    ) {

        throw new Error(
            "AI adaptation returned an invalid task list."
        );

    }


    if (
        !Array.isArray(
            result.updated_plan.critical_path
        )
    ) {

        result.updated_plan.critical_path =
            [];

    }


    if (
        !Array.isArray(
            result.changes
        )
    ) {

        result.changes =
            [];

    }


    return result;
}

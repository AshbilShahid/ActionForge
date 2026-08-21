/* =========================================================
   ACTIONFORGE AI ENGINE
   ========================================================= */

const apiKey = process.env.AI_API_KEY;

if (!apiKey) {
    throw new Error("AI_API_KEY is missing from Netlify.");
}

const API_URL = "https://api.b.ai/v1/chat/completions";

const MODEL = "deepseek-v4-flash";


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

For a normal plan, use exactly this structure:

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
- Keep the plan practical.
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
- Every task must have a unique ID.
- IDs must be T1, T2, T3, etc.
- Dependencies must reference existing task IDs.
- critical_path must reference existing task IDs.
- estimated_minutes must be an integer.
- Keep the number of tasks reasonable.
- Tasks must be concrete and actionable.
- The "changes" array should contain short explanations of what changed.
`;


/* =========================================================
   CALL B.AI
   ========================================================= */

/*
IMPORTANT:

There is intentionally NO AbortController timeout here.

The previous working implementation allowed B.AI to finish
its request normally. The newer artificial timeout could
terminate a valid adaptation request before B.AI finished.

Netlify will handle the function lifetime.
*/

async function callAI(userPrompt, systemPrompt = SYSTEM_PROMPT) {

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
                {
                    role: "user",
                    content: userPrompt
                }
            ],

            temperature: 0.2,

            max_tokens: 4000

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


        if (
            raw &&
            raw.includes("Inactivity Timeout")
        ) {

            throw new Error(
                "AI service timed out. Please try again."
            );

        }


        throw new Error(
            `B.AI request failed with status ${response.status}.`
        );

    }


    let data;


    try {

        data = JSON.parse(raw);

    }
    catch {

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
     * Standard OpenAI-compatible response:
     *
     * choices[0].message.content
     */

    const standardContent =
        data?.choices?.[0]?.message?.content;


    if (
        typeof standardContent === "string" &&
        standardContent.trim()
    ) {

        return standardContent.trim();

    }


    /*
     * Some providers return content as an array.
     */

    if (
        Array.isArray(standardContent)
    ) {

        const parts =
            standardContent
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


                    if (
                        typeof part?.content === "string"
                    ) {

                        return part.content;

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
     * Some response formats may expose output_text.
     */

    if (
        typeof data?.output_text === "string" &&
        data.output_text.trim()
    ) {

        return data.output_text.trim();

    }


    /*
     * Some Responses-style formats use output[].
     */

    if (
        Array.isArray(data?.output)
    ) {

        const parts = [];


        for (
            const item of data.output
        ) {

            if (
                !Array.isArray(item?.content)
            ) {

                continue;

            }


            for (
                const content of item.content
            ) {

                if (
                    typeof content?.text === "string" &&
                    content.text.trim()
                ) {

                    parts.push(
                        content.text.trim()
                    );

                }

            }

        }


        if (
            parts.length > 0
        ) {

            return parts
                .join("\n")
                .trim();

        }

    }


    /*
     * Nothing usable was found.
     */

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
        String(text).trim();


    /*
     * Remove Markdown code fences.
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
     * Extract JSON object from
     * surrounding text.
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


    /*
     * Debug information.
     */

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
            prompt,
            SYSTEM_PROMPT
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
     * Keep the existing plan intact.
     *
     * JSON.stringify with indentation makes the request easier
     * for DeepSeek to understand and was part of the version
     * that was already working reliably.
     */

    const planJSON =
        JSON.stringify(
            originalPlan,
            null,
            2
        );


    const prompt = `
You are adapting an existing ActionForge plan.

EXISTING PLAN:

${planJSON}


NEW PROBLEM:

${problem.trim()}


Adapt the existing plan.

Preserve the original goal.

Determine:

1. What changed?
2. Which tasks should be removed?
3. Which tasks should be modified?
4. Which tasks should be reordered?
5. Which dependencies changed?
6. Is the deadline still realistic?
7. What is now the critical path?
8. What should the user focus on immediately?


Return ONLY valid JSON.

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

IMPORTANT:

- Do not browse the web.
- Do not perform web searches.
- Do not use Google Search.
- Do not use external tools.
- Use only the existing plan and the user's new information.
- Preserve the original goal.
- Keep tasks practical and actionable.
- Return JSON only.
`;


    const data =
        await callAI(
            prompt,
            REPLAN_SYSTEM_PROMPT
        );


    const text =
        extractText(data);


    return parseJSON(
        text
    );

}

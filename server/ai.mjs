/* =========================================================
   ACTIONFORGE AI ENGINE
   AIHubMix Responses API
   ========================================================= */

const apiKey = process.env.AIHUBMIX_API_KEY;

if (!apiKey) {
    throw new Error(
        "AIHUBMIX_API_KEY is missing from Netlify."
    );
}


const API_URL =
    "https://aihubmix.com/v1/responses";

const MODEL =
    "gemini-3.7-flash-free";


/* =========================================================
   SYSTEM PROMPT
   ========================================================= */

const SYSTEM_PROMPT = `
You are ActionForge, an intelligent execution-planning agent.

Your job is to transform a user's goal into a practical,
realistic and executable action plan.

IMPORTANT:

DO NOT browse the web.

DO NOT perform web searches.

DO NOT use Google Search.

DO NOT use external search tools.

DO NOT request outside information.

Use ONLY information supplied by the user.

If information is missing, make reasonable assumptions
and place them in the assumptions field.

Create concrete actions rather than vague advice.

Bad:

"Work on the website."

Good:

"Create the homepage structure and write the hero section."

Return ONLY valid JSON.

Do not use Markdown.

Do not use code fences.

Do not include explanations outside the JSON.

The JSON must follow this structure:

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
- Use T1, T2, T3, etc.
- Dependencies must reference existing task IDs.
- critical_path must reference existing task IDs.
- estimated_minutes must be an integer.
- Keep the number of tasks reasonable.
- Do not invent unnecessary requirements.
- Prioritize actions that directly move the user toward the goal.
- Return JSON only.
`;


/* =========================================================
   CALL AIHUBMIX
   ========================================================= */

async function callAI(input) {

    console.log(
        `ActionForge → AIHubMix → ${MODEL}`
    );


    const response = await fetch(
        API_URL,
        {
            method: "POST",

            headers: {
                "Authorization":
                    `Bearer ${apiKey.trim()}`,

                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({

                model: MODEL,

                input: [
                    {
                        role: "system",

                        content: [
                            {
                                type: "input_text",

                                text: SYSTEM_PROMPT
                            }
                        ]
                    },

                    {
                        role: "user",

                        content: [
                            {
                                type: "input_text",

                                text: input
                            }
                        ]
                    }
                ],

                max_output_tokens: 4000,

                temperature: 0.2

            })
        }
    );


    const raw =
        await response.text();


    console.log(
        "AIHubMix HTTP status:",
        response.status
    );


    if (!response.ok) {

        console.error(
            "AIHubMix error:",
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
            "AIHubMix returned non-JSON:",
            raw
        );

        throw new Error(
            "AIHubMix returned an invalid API response."
        );

    }


    return data;
}


/* =========================================================
   EXTRACT TEXT FROM RESPONSES API
   ========================================================= */

function extractText(data) {

    /*
     * AIHubMix Responses API normally returns
     * generated content inside output.
     */

    if (
        typeof data?.output_text === "string" &&
        data.output_text.trim()
    ) {

        return data.output_text.trim();

    }


    /*
     * Fallback for structured output arrays.
     */

    if (Array.isArray(data?.output)) {

        for (const item of data.output) {

            if (!Array.isArray(item?.content)) {
                continue;
            }


            for (const content of item.content) {

                if (
                    typeof content?.text === "string" &&
                    content.text.trim()
                ) {

                    return content.text.trim();

                }

            }

        }

    }


    /*
     * Another possible response structure.
     */

    if (
        typeof data?.choices?.[0]?.message?.content ===
        "string"
    ) {

        return data.choices[0]
            .message
            .content
            .trim();

    }


    console.error(
        "Could not find generated text in response:",
        JSON.stringify(data, null, 2)
    );


    throw new Error(
        "AI returned no usable text."
    );
}


/* =========================================================
   ROBUST JSON EXTRACTION
   ========================================================= */

function parseJSON(text) {

    if (!text) {
        throw new Error(
            "AI returned an empty response."
        );
    }

    let cleaned = String(text).trim();

    cleaned = cleaned
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

    try {
        return JSON.parse(cleaned);
    } catch (error) {
        // Continue.
    }

    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (
        start !== -1 &&
        end !== -1 &&
        end > start
    ) {

        const extracted =
            cleaned.substring(start, end + 1);

        try {
            return JSON.parse(extracted);
        } catch (error) {
            // Continue.
        }
    }

    /*
     * TEMPORARY DEBUGGING
     *
     * Expose the actual model response.
     */

    throw new Error(
        "RAW_AI_RESPONSE::" +
        cleaned
    );
}
    /*
     * Log the exact response so we can
     * diagnose it if something goes wrong.
     */

    console.error(
        "========== AI RAW TEXT =========="
    );

    console.error(text);

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

export async function generatePlan(goal) {

    if (
        !goal ||
        typeof goal !== "string" ||
        !goal.trim()
    ) {

        throw new Error(
            "Goal cannot be empty."
        );

    }


    const input = `

Create an ActionForge execution plan for:

${goal.trim()}

Remember:

- Do not browse the web.
- Do not perform web searches.
- Do not use Google Search.
- Use only information supplied by the user.
- Return ONLY the requested JSON.

`;


    const data =
        await callAI(input);


    const text =
        extractText(data);


    return parseJSON(text);
}


/* =========================================================
   REALITY CHECK / REPLAN
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


    const input = `

You are adapting an existing ActionForge plan.

EXISTING PLAN:

${JSON.stringify(
    originalPlan,
    null,
    2
)}


NEW REALITY:

${problem.trim()}


Adapt the existing plan.

DO NOT create an unrelated plan.

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


Return ONLY valid JSON using this structure:

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


Do NOT browse the web.

Do NOT perform web searches.

Do NOT use Google Search.

Use only the existing plan and the user's new information.

Return JSON only.

`;


    const data =
        await callAI(input);


    const text =
        extractText(data);


    return parseJSON(text);
}

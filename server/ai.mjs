const apiKey = process.env.AIHUBMIX_API_KEY;

if (!apiKey) {
    throw new Error("AIHUBMIX_API_KEY is missing from Netlify.");
}

const API_URL = "https://aihubmix.com/v1/responses";
const MODEL = "gemini-3.7-flash-free";

const SYSTEM_PROMPT = `
You are ActionForge, an AI execution-planning assistant.

Turn the user's goal into a practical action plan.

IMPORTANT:
- Do NOT browse the web.
- Do NOT perform web searches.
- Do NOT use Google Search.
- Do NOT use external search tools.
- Use only information supplied by the user.
- If information is missing, make reasonable assumptions.

Return ONLY valid JSON.
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
- estimated_minutes is an integer.
- Keep the number of tasks reasonable.
`;


/* =========================================================
   CALL AIHUBMIX
   ========================================================= */

async function callAI(userPrompt) {
    const response = await fetch(API_URL, {
        method: "POST",

        headers: {
            "Authorization": `Bearer ${apiKey.trim()}`,
            "Content-Type": "application/json"
        },

        body: JSON.stringify({
            model: MODEL,

            input: [
                {
                    role: "system",
                    content: SYSTEM_PROMPT
                },
                {
                    role: "user",
                    content: userPrompt
                }
            ],

            max_output_tokens: 4000
        })
    });

    const raw = await response.text();

    console.log("AIHubMix status:", response.status);

    if (!response.ok) {
        console.error("AIHubMix error:", raw);
        throw new Error(`${response.status} ${raw}`);
    }

    let data;

    try {
        data = JSON.parse(raw);
    } catch {
        throw new Error(
            "AIHubMix returned a non-JSON API response."
        );
    }

    return data;
}


/* =========================================================
   EXTRACT MODEL TEXT
   ========================================================= */

function extractText(data) {

    if (
        typeof data.output_text === "string" &&
        data.output_text.trim()
    ) {
        return data.output_text.trim();
    }

    if (Array.isArray(data.output)) {

        for (const item of data.output) {

            if (!Array.isArray(item.content)) {
                continue;
            }

            for (const content of item.content) {

                if (
                    typeof content.text === "string" &&
                    content.text.trim()
                ) {
                    return content.text.trim();
                }
            }
        }
    }

    if (
        data.choices &&
        data.choices[0] &&
        data.choices[0].message &&
        typeof data.choices[0].message.content === "string"
    ) {
        return data.choices[0].message.content.trim();
    }

    console.error(
        "FULL AI RESPONSE:",
        JSON.stringify(data, null, 2)
    );

    throw new Error(
        "AI returned no usable text."
    );
}


/* =========================================================
   PARSE JSON
   ========================================================= */

function parseJSON(text) {

    if (!text) {
        throw new Error("AI returned an empty response.");
    }

    let cleaned = String(text).trim();

    // Remove Markdown fences
    cleaned = cleaned
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

    // Try direct JSON
    try {
        return JSON.parse(cleaned);
    } catch {
        // Continue
    }

    // Find JSON object inside surrounding text
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
        } catch {
            // Continue
        }
    }

    console.error(
        "========== RAW AI RESPONSE =========="
    );

    console.error(cleaned);

    console.error(
        "======================================"
    );

    throw new Error(
        "RAW_AI_RESPONSE::" + cleaned
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
        throw new Error("Goal cannot be empty.");
    }

    if (goal.length > 5000) {
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
- Use only the user's information.
- Return JSON only.
`;

    const data = await callAI(prompt);

    const text = extractText(data);

    return parseJSON(text);
}


/* =========================================================
   REPLAN
   ========================================================= */

export async function replan(originalPlan, problem) {

    if (!originalPlan) {
        throw new Error("Original plan is required.");
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

    const prompt = `
You are adapting an existing ActionForge plan.

EXISTING PLAN:

${JSON.stringify(originalPlan, null, 2)}

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

Use this structure:

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
`;

    const data = await callAI(prompt);

    const text = extractText(data);

    return parseJSON(text);
}

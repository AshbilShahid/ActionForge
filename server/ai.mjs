import { GoogleGenAI } from "@google/genai";


/* =========================================================
   ACTIONFORGE AI ENGINE
   ========================================================= */

const apiKey = process.env.AIHUBMIX_API_KEY;

if (!apiKey) {
    throw new Error(
        "AIHUBMIX_API_KEY is missing from the Netlify Function environment."
    );
}


const MODEL = "gemini-3.7-flash-free";


const ai = new GoogleGenAI({
    apiKey: apiKey.trim(),

    httpOptions: {
        baseUrl: "https://aihubmix.com/gemini"
    }
});


console.log(
    "ActionForge AI initialized:",
    {
        model: MODEL,
        provider: "AIHubMix"
    }
);


/* =========================================================
   SYSTEM PROMPT
   ========================================================= */

const SYSTEM_PROMPT = `
You are ActionForge.

You transform a user's goal into a practical execution plan.

IMPORTANT:

DO NOT browse the web.

DO NOT perform web searches.

DO NOT use Google Search.

DO NOT use external search tools.

Use ONLY the information provided by the user.

If information is missing, make reasonable assumptions.


Your plans should:

1. Understand the user's goal.
2. Identify the desired outcome.
3. Identify deadlines.
4. Identify constraints.
5. Break the goal into concrete tasks.
6. Remove unnecessary work.
7. Identify dependencies.
8. Estimate realistic time requirements.
9. Prioritize tasks.
10. Identify the critical path.
11. Give one useful strategic insight.


Avoid vague tasks.

Bad:

"Work on the website."

Good:

"Create the homepage structure and write the hero section."


=========================================================
OUTPUT
=========================================================

Return ONLY a JSON object.

Do not write an introduction.

Do not write an explanation.

Do not use Markdown.

Do not use code fences.

Use exactly this structure:

{
  "goal": "string",
  "summary": "string",
  "deadline": "string",
  "priority": "low | medium | high | critical",

  "assumptions": [
    "string"
  ],

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

  "critical_path": [
    "T1"
  ],

  "insight": "string"
}


Rules:

- Every task must have a unique ID.
- IDs must be T1, T2, T3, etc.
- Dependencies must reference existing IDs.
- critical_path must reference existing IDs.
- estimated_minutes must be an integer.
- Keep the number of tasks reasonable.
- Do not invent unnecessary requirements.
- Return JSON only.
`;


/* =========================================================
   EXTRACT JSON SAFELY
   ========================================================= */

function extractJSON(text) {

    if (!text) {
        throw new Error(
            "AI returned an empty response."
        );
    }


    let cleaned = text.trim();


    /*
     * Remove Markdown code fences.
     */

    cleaned = cleaned
        .replace(/^```json\s*/i, "")
        .replace(/^```javascript\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();


    /*
     * First attempt:
     * parse the entire response.
     */

    try {

        return JSON.parse(cleaned);

    } catch {
        // Continue to recovery.
    }


    /*
     * Second attempt:
     * Find the first JSON object.
     */

    const firstBrace =
        cleaned.indexOf("{");

    const lastBrace =
        cleaned.lastIndexOf("}");


    if (
        firstBrace !== -1 &&
        lastBrace !== -1 &&
        lastBrace > firstBrace
    ) {

        const possibleJSON =
            cleaned.slice(
                firstBrace,
                lastBrace + 1
            );


        try {

            return JSON.parse(
                possibleJSON
            );

        } catch {
            // Continue.
        }

    }


    /*
     * Third attempt:
     * Sometimes Gemini returns a JSON object
     * inside a quoted string.
     */

    try {

        const parsed =
            JSON.parse(cleaned);

        if (typeof parsed === "string") {

            return JSON.parse(parsed);

        }

    } catch {
        // Continue.
    }


    /*
     * Nothing worked.
     *
     * Log the actual AI response so we can
     * diagnose it from Netlify logs.
     */

    console.error(
        "========== INVALID AI RESPONSE =========="
    );

    console.error(
        cleaned
    );

    console.error(
        "=========================================="
    );


    throw new Error(
        "AI returned invalid JSON."
    );
}


/* =========================================================
   CALL GEMINI
   ========================================================= */

async function callAI(prompt) {

    console.log(
        `Calling ${MODEL} through AIHubMix...`
    );


    try {

        const response =
            await ai.models.generateContent({

                model: MODEL,

                contents: prompt,

                config: {

                    systemInstruction:
                        SYSTEM_PROMPT,

                    temperature: 0.2,

                    responseMimeType:
                        "application/json"

                }

            });


        /*
         * Gemini SDK normally exposes
         * the generated text through .text
         */

        const text =
            response?.text;


        if (!text) {

            console.error(
                "Complete Gemini response:",
                response
            );

            throw new Error(
                "AI returned an empty response."
            );

        }


        console.log(
            "AI response received successfully."
        );


        return text;


    } catch (error) {

        console.error(
            "AIHubMix/Gemini error:",
            error
        );


        throw new Error(
            error?.message ||
            "AI request failed."
        );

    }

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


    if (goal.length > 5000) {

        throw new Error(
            "Goal is too long."
        );

    }


    const prompt = `

Create an ActionForge execution plan.

USER GOAL:

${goal.trim()}


Remember:

- Do not browse the web.
- Do not search the web.
- Use only the information provided.
- Make reasonable assumptions if necessary.
- Return ONLY the requested JSON object.

`;


    const text =
        await callAI(prompt);


    return extractJSON(text);
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


    const prompt = `

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

Analyze:

1. What changed?
2. Which tasks should be removed?
3. Which tasks should be modified?
4. Which tasks should be reordered?
5. Which dependencies changed?
6. Is the deadline still realistic?
7. What is now the critical path?
8. What should the user focus on immediately?


Return ONLY this JSON structure:

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

  "changes": [
    "string"
  ]
}


IMPORTANT:

Do not browse the web.

Do not perform web searches.

Do not use Google Search.

Use only the existing plan and the user's new information.

Return JSON only.

`;


    const text =
        await callAI(prompt);


    return extractJSON(text);
}

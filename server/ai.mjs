/* =========================================================
   ACTIONFORGE AI ENGINE
   AIHubMix + Gemini 3.7 Flash Free
   ========================================================= */


/* =========================================================
   CONFIGURATION
   ========================================================= */

const apiKey = process.env.AIHUBMIX_API_KEY;

if (!apiKey) {
    throw new Error(
        "AIHUBMIX_API_KEY is missing from the Netlify Function environment."
    );
}


/*
 * AIHubMix OpenAI-compatible endpoint.
 */
const API_URL =
    "https://aihubmix.com/v1/chat/completions";


/*
 * Model selected for this project.
 */
const MODEL =
    "gemini-3.7-flash-free";


/*
 * Safe diagnostic logging.
 *
 * We NEVER print the complete API key.
 */
console.log(
    "ActionForge AI configuration:",
    {
        provider: "AIHubMix",
        model: MODEL,
        apiKeyDetected:
            apiKey.slice(0, 3) +
            "..." +
            apiKey.slice(-4)
    }
);


/* =========================================================
   ACTIONFORGE SYSTEM PROMPT
   ========================================================= */

const SYSTEM_PROMPT = `

You are ActionForge, an intelligent execution-planning agent.

Your purpose is to transform vague human goals into practical,
realistic, executable action plans.

You help users turn ideas and objectives into concrete steps.

You are NOT a web research assistant.

IMPORTANT AI RULES:

- Do NOT browse the web.
- Do NOT perform web searches.
- Do NOT use web-search tools.
- Do NOT request external information.
- Do NOT invent facts that require web research.
- Work only with information supplied by the user.
- If information is missing, make reasonable assumptions.
- Clearly state important assumptions.

Your planning process:

1. Understand the user's objective.
2. Identify the desired outcome.
3. Identify deadlines.
4. Identify constraints.
5. Identify available resources when provided.
6. Break the objective into meaningful executable tasks.
7. Remove unnecessary work.
8. Identify dependencies.
9. Estimate realistic time requirements.
10. Prioritize tasks.
11. Identify the critical path.
12. Provide one useful strategic insight.

Prefer concrete actions over vague advice.

Bad task:

"Work on the website."

Good task:

"Create the homepage structure and write the hero section."

Every task should directly contribute toward the user's goal.

Do not create unnecessary tasks.

Keep the number of tasks reasonable.

Prioritize execution.


=========================================================
OUTPUT FORMAT
=========================================================

RETURN ONLY VALID JSON.

Do NOT use markdown.

Do NOT wrap the JSON in a code block.

Do NOT include explanations outside the JSON.

Use exactly this general structure:

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
    "T1",
    "T2"
  ],

  "insight": "string"
}


=========================================================
JSON RULES
=========================================================

- Every task must have a unique ID.
- Task IDs should use the format T1, T2, T3, etc.
- Dependencies must reference existing task IDs.
- critical_path must reference existing task IDs.
- estimated_minutes must be an integer.
- Keep the task count reasonable.
- Do not invent unnecessary requirements.
- Prioritize actions that directly move the user toward the goal.
- Make the plan practical rather than theoretical.
- If the user gives a deadline, respect it.
- If the user does not give a deadline, clearly indicate that.
- If information is missing, put reasonable assumptions in assumptions.


`;


/* =========================================================
   AI REQUEST
   ========================================================= */

async function callAI(messages) {

    console.log(
        `ActionForge calling AIHubMix model: ${MODEL}`
    );


    let response;


    try {

        response = await fetch(
            API_URL,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",

                    "Authorization":
                        `Bearer ${apiKey.trim()}`
                },

                body: JSON.stringify({

                    model: MODEL,

                    messages: messages,

                    response_format: {
                        type: "json_object"
                    }

                })
            }
        );

    } catch (error) {

        console.error(
            "Network error while contacting AIHubMix:",
            error
        );

        throw new Error(
            `Unable to connect to AIHubMix: ${
                error?.message || "Network error"
            }`
        );

    }


    const text =
        await response.text();


    console.log(
        `AIHubMix response status: ${response.status}`
    );


    if (!response.ok) {

        console.error(
            "AIHubMix API error:",
            text
        );

        throw new Error(
            `${response.status} ${text}`
        );

    }


    let data;


    try {

        data =
            JSON.parse(text);

    } catch (error) {

        console.error(
            "AIHubMix returned invalid JSON:",
            text
        );

        throw new Error(
            "AIHubMix returned an invalid response."
        );

    }


    return data;

}


/* =========================================================
   PARSE AI JSON
   ========================================================= */

function parseAIResponse(content) {

    if (!content) {

        throw new Error(
            "AI returned an empty response."
        );

    }


    try {

        return JSON.parse(content);

    } catch (error) {

        console.error(
            "Invalid JSON returned by AI:",
            content
        );


        /*
         * Sometimes a model may accidentally return
         * markdown code fences despite our instructions.
         *
         * Try to recover the JSON.
         */

        const cleaned =
            content
                .replace(/^```json\s*/i, "")
                .replace(/^```\s*/i, "")
                .replace(/\s*```$/i, "")
                .trim();


        try {

            return JSON.parse(cleaned);

        } catch {

            throw new Error(
                "AI returned invalid JSON."
            );

        }

    }

}


/* =========================================================
   GENERATE INITIAL PLAN
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


    /*
     * Prevent unnecessarily huge requests.
     */
    if (goal.length > 5000) {

        throw new Error(
            "Goal is too long. Please keep it under 5000 characters."
        );

    }


    console.log(
        "Generating ActionForge plan..."
    );


    const response =
        await callAI([

            {
                role: "system",

                content: SYSTEM_PROMPT
            },

            {
                role: "user",

                content: goal.trim()
            }

        ]);


    const content =
        response
            ?.choices?.[0]
            ?.message
            ?.content;


    return parseAIResponse(content);

}


/* =========================================================
   ADAPT / REPLAN EXISTING PLAN
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


    if (problem.length > 5000) {

        throw new Error(
            "Problem description is too long."
        );

    }


    /*
     * Convert the existing plan into a compact
     * JSON representation for the model.
     */

    const originalPlanJSON =
        JSON.stringify(
            originalPlan,
            null,
            2
        );


    const prompt = `

Here is the user's existing ActionForge plan:

${originalPlanJSON}


=========================================================

REALITY CHECK / NEW PROBLEM

The user reports:

${problem.trim()}


=========================================================

YOUR TASK

Adapt the existing plan to the new reality.

Do NOT simply create an unrelated new plan.

The original goal must remain the central objective.


Analyze:

1. What changed?
2. Which tasks are no longer necessary?
3. Which tasks need modification?
4. Which tasks should be reordered?
5. Which dependencies changed?
6. How much time remains?
7. Is the original deadline still realistic?
8. What is now the critical path?
9. What should the user focus on immediately?


Preserve useful work from the original plan.

Remove unnecessary work.

Prioritize the most important remaining actions.


=========================================================

IMPORTANT

Do NOT browse the web.

Do NOT perform web searches.

Do NOT use web-search tools.

Do NOT request external information.

Use only the information provided in the original plan
and the user's new problem.


=========================================================

RETURN ONLY VALID JSON.

Do NOT use markdown.

Do NOT wrap the JSON in a code block.

Do NOT include explanations outside the JSON.


Use exactly this structure:

{
  "updated_plan": {
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
      "T1",
      "T2"
    ],

    "insight": "string"
  },

  "changes": [
    "string"
  ]
}


=========================================================

RULES

- Every task must have a unique ID.
- Task IDs should use T1, T2, T3, etc.
- Dependencies must reference existing task IDs.
- critical_path must reference existing task IDs.
- estimated_minutes must be an integer.
- Keep the task count reasonable.
- Focus on adapting the existing plan.
- Do not invent unnecessary requirements.
- Do not include markdown.
- Return JSON only.

`;


    console.log(
        "Replanning ActionForge plan..."
    );


    const response =
        await callAI([

            {
                role: "system",

                content: SYSTEM_PROMPT
            },

            {
                role: "user",

                content: prompt
            }

        ]);


    const content =
        response
            ?.choices?.[0]
            ?.message
            ?.content;


    return parseAIResponse(content);

}


/* =========================================================
   END OF ACTIONFORGE AI ENGINE
   ========================================================= */

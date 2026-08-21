import OpenAI from "openai";


/* =========================================================
   AIHUBMIX CONFIGURATION
   ========================================================= */

const apiKey = process.env.AIHUBMIX_API_KEY;

if (!apiKey) {
    throw new Error(
        "AIHUBMIX_API_KEY is missing from the Netlify Function environment."
    );
}


/*
 * Only log a small portion of the key for debugging.
 * NEVER log the complete API key.
 */
console.log(
    "AIHubMix API key detected:",
    apiKey.slice(0, 3) + "..." + apiKey.slice(-4)
);


const client = new OpenAI({

    apiKey: apiKey.trim(),

    /*
     * AIHubMix OpenAI-compatible endpoint.
     */
    baseURL: "https://aihubmix.com/v1"

});


/* =========================================================
   MODEL FALLBACK SYSTEM
   ========================================================= */

const MODELS = [

    /*
     * Primary model
     */
    "gpt-4.1-free",

    /*
     * Fallback model
     */
    "gpt-4o-free"

];


/* =========================================================
   ACTIONFORGE SYSTEM PROMPT
   ========================================================= */

const SYSTEM_PROMPT = `

You are ActionForge, an intelligent execution-planning agent.

Your purpose is to transform vague human goals into practical,
executable action plans.

You are NOT a web research assistant.

IMPORTANT AI BEHAVIOR:

- Do not browse the web.
- Do not perform web searches.
- Do not use web-search tools.
- Do not request external information.
- Work only with information supplied by the user.
- If information is missing, make reasonable assumptions.
- Clearly state important assumptions.

Your planning process:

1. Understand the user's objective.
2. Identify the desired outcome.
3. Identify deadlines and constraints.
4. Break the objective into meaningful executable tasks.
5. Remove unnecessary work.
6. Identify dependencies.
7. Estimate realistic time requirements.
8. Prioritize tasks.
9. Identify the critical path.
10. Provide one useful strategic insight.

Prefer concrete actions.

Avoid vague tasks.

Bad:

"Work on the website."

Good:

"Create the homepage structure and write the hero section."

Keep the number of tasks reasonable.

Every task should directly contribute toward the user's goal.


RETURN ONLY VALID JSON.

Use this structure:

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


RULES:

- Every task must have a unique ID.
- Dependencies must reference existing task IDs.
- critical_path must reference existing task IDs.
- estimated_minutes must be an integer.
- Keep the task count reasonable.
- Do not invent unnecessary requirements.
- Prioritize actions that directly move the user toward the goal.
- Do not include markdown.
- Do not wrap JSON in code fences.
- Return JSON only.

`;


/* =========================================================
   AI REQUEST WITH AUTOMATIC FALLBACK
   ========================================================= */

async function callAI(messages) {

    let lastError = null;


    for (const model of MODELS) {

        try {

            console.log(
                `ActionForge attempting model: ${model}`
            );


            const response =
                await client.chat.completions.create({

                    model: model,

                    messages: messages,

                    response_format: {
                        type: "json_object"
                    }

                });


            console.log(
                `ActionForge successfully used model: ${model}`
            );


            return response;


        } catch (error) {

            lastError = error;


            console.error(
                `Model ${model} failed:`,
                error?.message || error
            );


            /*
             * Try the next model automatically.
             */

        }

    }


    throw new Error(
        `All AI models failed. Last error: ${
            lastError?.message || "Unknown AI error"
        }`
    );

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


    const response = await callAI([

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

        throw new Error(
            "AI returned invalid JSON."
        );

    }

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


    const prompt = `

Here is the user's existing ActionForge plan:

${JSON.stringify(
    originalPlan,
    null,
    2
)}


The user reports that reality has changed:

${problem.trim()}


Your task is to ADAPT the existing plan.

Do NOT simply create an unrelated new plan.

Preserve the original goal.

Analyze what changed and determine how the remaining work should be modified.


Your objectives:

1. Understand what went wrong.
2. Preserve the original goal.
3. Preserve the deadline if realistically possible.
4. Remove unnecessary work.
5. Reorder tasks when necessary.
6. Update dependencies when necessary.
7. Adjust estimated times when appropriate.
8. Produce a practical revised plan.
9. Clearly explain what changed.
10. Prioritize the most important remaining work.


Do not browse the web.

Do not perform web searches.

Do not use web-search tools.

Do not use external information.


RETURN ONLY VALID JSON.


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


RULES:

- Every task must have a unique ID.
- Dependencies must reference existing task IDs.
- critical_path must reference existing task IDs.
- estimated_minutes must be an integer.
- Keep the task count reasonable.
- Do not invent unnecessary requirements.
- Focus on adapting the existing plan.
- Do not include markdown.
- Do not wrap JSON in code fences.
- Return JSON only.

`;


    const response = await callAI([

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


    if (!content) {

        throw new Error(
            "AI returned an empty response."
        );

    }


    try {

        return JSON.parse(content);

    } catch (error) {

        console.error(
            "Invalid replanning JSON returned by AI:",
            content
        );

        throw new Error(
            "AI returned invalid JSON while replanning."
        );

    }

}

/* =========================================================

   ACTIONFORGE REPLAN FUNCTION
   
   ========================================================= */

import {
    replan
} from "../../server/ai.mjs";


/* =========================================================
   RESPONSE HELPER
   ========================================================= */

function jsonResponse(
    data,
    status = 200
) {

    return new Response(
        JSON.stringify(data),
        {
            status,

            headers: {
                "Content-Type":
                    "application/json",

                "Cache-Control":
                    "no-store"
            }
        }
    );
}


/* =========================================================
   NETLIFY FUNCTION
   ========================================================= */

export default async function handler(
    request
) {

    try {

        /*
         * Only POST is allowed.
         */

        if (
            request.method !== "POST"
        ) {

            return jsonResponse(
                {
                    error:
                        "Method not allowed."
                },
                405
            );
        }


        /*
         * Read request body.
         */

        let body;


        try {

            body =
                await request.json();

        }
        catch {

            return jsonResponse(
                {
                    error:
                        "Invalid request body."
                },
                400
            );
        }


        const originalPlan =
            body?.plan;


        const problem =
            body?.problem;


        /*
         * Validate plan.
         */

        if (
            !originalPlan ||
            typeof originalPlan !==
            "object"
        ) {

            return jsonResponse(
                {
                    error:
                        "A valid existing plan is required."
                },
                400
            );
        }


        /*
         * Validate problem.
         */

        if (
            !problem ||
            typeof problem !== "string" ||
            !problem.trim()
        ) {

            return jsonResponse(
                {
                    error:
                        "Tell ActionForge what changed."
                },
                400
            );
        }


        /*
         * Prevent accidentally huge requests.
         */

        if (
            problem.length > 3000
        ) {

            return jsonResponse(
                {
                    error:
                        "Problem description is too long."
                },
                400
            );
        }


        /*
         * Ask the AI engine to adapt the plan.
         */

        const result =
            await replan(
                originalPlan,
                problem.trim()
            );


        /*
         * Return exactly what app.js expects.
         */

        return jsonResponse(
            {
                updated_plan:
                    result.updated_plan,

                changes:
                    Array.isArray(
                        result.changes
                    )
                        ? result.changes
                        : []
            },
            200
        );

    }
    catch (error) {

        console.error(
            "REPLAN ERROR:",
            error
        );


        return jsonResponse(
            {
                error:
                    error?.message ||
                    "Unable to adapt plan."
            },
            500
        );
    }
}

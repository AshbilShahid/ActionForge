/* =========================================================
   ACTIONFORGE REPLAN NETLIFY FUNCTION
   ========================================================= */

import {
    replan
} from "../../server/ai.mjs";


/* =========================================================
   JSON RESPONSE
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
   REPLAN FUNCTION
   ========================================================= */

export default async function handler(
    request
) {

    try {

        /*
         * Only POST.
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
         * Parse body.
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


        const plan =
            body?.plan;

        const problem =
            body?.problem;


        /*
         * Validate plan.
         */

        if (
            !plan ||
            typeof plan !== "object"
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


        console.log(
            "ACTIONFORGE REPLAN STARTED"
        );


        /*
         * Call AI.
         */

        const result =
            await replan(
                plan,
                problem.trim()
            );


        console.log(
            "ACTIONFORGE REPLAN SUCCESS"
        );


        /*
         * Return the exact structure
         * expected by app.js.
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
            "========== REPLAN ERROR =========="
        );

        console.error(
            error
        );

        console.error(
            "==================================="
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

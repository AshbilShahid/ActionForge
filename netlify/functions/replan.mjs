/* =========================================================
   ACTIONFORGE REPLAN FUNCTION
   ========================================================= */

import { replan } from "../../server/ai.mjs";


/* =========================================================
   NETLIFY FUNCTION
   ========================================================= */

export default async (request) => {

    try {

        /*
        =====================================================
        METHOD CHECK
        =====================================================
        */

        if (
            request.method !== "POST"
        ) {

            return new Response(
                JSON.stringify({
                    error:
                        "Method not allowed."
                }),
                {
                    status: 405,

                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );

        }


        /*
        =====================================================
        READ REQUEST BODY
        =====================================================
        */

        let body;


        try {

            body =
                await request.json();

        }
        catch {

            return new Response(
                JSON.stringify({
                    error:
                        "Invalid request body."
                }),
                {
                    status: 400,

                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );

        }


        /*
        =====================================================
        EXTRACT DATA
        =====================================================
        */

        const plan =
            body?.plan;


        const problem =
            body?.problem;


        /*
        =====================================================
        VALIDATE PLAN
        =====================================================
        */

        if (
            !plan ||
            typeof plan !== "object"
        ) {

            return new Response(
                JSON.stringify({
                    error:
                        "A valid existing plan is required."
                }),
                {
                    status: 400,

                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );

        }


        /*
        =====================================================
        VALIDATE PROBLEM
        =====================================================
        */

        if (
            !problem ||
            typeof problem !== "string" ||
            !problem.trim()
        ) {

            return new Response(
                JSON.stringify({
                    error:
                        "A valid problem description is required."
                }),
                {
                    status: 400,

                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );

        }


        /*
        =====================================================
        PROBLEM LENGTH PROTECTION
        =====================================================
        */

        if (
            problem.length > 3000
        ) {

            return new Response(
                JSON.stringify({
                    error:
                        "Problem description is too long."
                }),
                {
                    status: 400,

                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );

        }


        /*
        =====================================================
        ADAPT PLAN
        =====================================================
        */

        const result =
            await replan(
                plan,
                problem.trim()
            );


        /*
        =====================================================
        VALIDATE AI RESULT
        =====================================================
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


        /*
        =====================================================
        SUCCESS
        =====================================================
        */

        return new Response(
            JSON.stringify({
                updated_plan:
                    result.updated_plan,

                changes:
                    Array.isArray(
                        result.changes
                    )
                        ? result.changes
                        : []
            }),
            {
                status: 200,

                headers: {
                    "Content-Type":
                        "application/json"
                }
            }
        );

    }
    catch (error) {

        /*
        =====================================================
        ERROR HANDLING
        =====================================================
        */

        console.error(
            "REPLAN ERROR:",
            error
        );


        return new Response(
            JSON.stringify({
                error:
                    error?.message ||
                    "Unable to adapt the plan."
            }),
            {
                status: 500,

                headers: {
                    "Content-Type":
                        "application/json"
                }
            }
        );

    }

};

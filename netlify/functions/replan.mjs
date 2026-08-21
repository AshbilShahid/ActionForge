import {
    replan
} from "../../server/ai.mjs";


export default async function handler(
    request
) {

    try {

        /* =================================================
           METHOD
           ================================================= */

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


        /* =================================================
           BODY
           ================================================= */

        let body;


        try {

            body =
                await request.json();

        }
        catch {

            return new Response(

                JSON.stringify({
                    error:
                        "Invalid JSON request."
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


        const plan =
            body?.plan;


        const problem =
            body?.problem;


        /* =================================================
           VALIDATION
           ================================================= */

        if (!plan) {

            return new Response(

                JSON.stringify({
                    error:
                        "Original plan is required."
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


        if (
            !problem ||
            typeof problem !== "string" ||
            !problem.trim()
        ) {

            return new Response(

                JSON.stringify({
                    error:
                        "Problem description is required."
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


        /* =================================================
           AI
           ================================================= */

        const updated =
            await replan(
                plan,
                problem
            );


        /* =================================================
           RESPONSE
           ================================================= */

        return new Response(

            JSON.stringify(
                updated
            ),

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

}

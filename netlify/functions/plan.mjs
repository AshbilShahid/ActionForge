import { generatePlan } from "../../server/ai.mjs";

export default async (request) => {
    try {
        if (request.method !== "POST") {
            return new Response(
                JSON.stringify({
                    error: "Method not allowed."
                }),
                {
                    status: 405,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        const body = await request.json();
        const goal = body?.goal;

        if (!goal || typeof goal !== "string") {
            return new Response(
                JSON.stringify({
                    error: "A valid goal is required."
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        if (goal.length > 5000) {
            return new Response(
                JSON.stringify({
                    error: "Goal is too long."
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        const plan = await generatePlan(goal);

        return new Response(
            JSON.stringify(plan),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

    } catch (error) {
        console.error("PLAN ERROR:", error);

        return new Response(
            JSON.stringify({
                error: error?.message || "Unable to generate plan.",
                details: error?.status || null
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    }
};

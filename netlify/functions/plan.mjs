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

    console.error(error);

    return new Response(
      JSON.stringify({
        error: "Unable to generate plan."
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

import { replan } from "../../server/ai.mjs";

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

    const plan = body?.plan;
    const problem = body?.problem;

    if (!plan) {

      return new Response(
        JSON.stringify({
          error: "Existing plan is required."
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

    }

    if (
      !problem ||
      typeof problem !== "string"
    ) {

      return new Response(
        JSON.stringify({
          error: "A valid problem description is required."
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

    }

    if (problem.length > 3000) {

      return new Response(
        JSON.stringify({
          error: "Problem description is too long."
        }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        }
      );

    }

    const result =
      await replan(
        plan,
        problem
      );

    return new Response(
      JSON.stringify(result),
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
        error: "Unable to replan."
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

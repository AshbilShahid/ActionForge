const apiKey = process.env.AIHUBMIX_API_KEY;

export default async () => {

    if (!apiKey) {
        return new Response(
            JSON.stringify({
                error: "AIHUBMIX_API_KEY missing"
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    }

    try {

        const response = await fetch(
            "https://aihubmix.com/gemini/v1beta/models/gemini-3.7-flash-free:generateContent",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey.trim()}`
                },

                body: JSON.stringify({
                    contents: [
                        {
                            role: "user",
                            parts: [
                                {
                                    text: "Reply with exactly: ACTIONFORGE_TEST_OK"
                                }
                            ]
                        }
                    ]
                })
            }
        );

        const text = await response.text();

        return new Response(
            JSON.stringify({
                status: response.status,
                response: text
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

    } catch (error) {

        return new Response(
            JSON.stringify({
                error: error.message
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

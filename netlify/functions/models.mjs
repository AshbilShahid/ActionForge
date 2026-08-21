const apiKey = process.env.AIHUBMIX_API_KEY;

export default async () => {
    try {
        if (!apiKey) {
            return new Response(
                JSON.stringify({
                    error: "AIHUBMIX_API_KEY is missing."
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        const response = await fetch(
            "https://aihubmix.com/v1/models",
            {
                headers: {
                    "Authorization": `Bearer ${apiKey.trim()}`
                }
            }
        );

        const text = await response.text();

        return new Response(text, {
            status: response.status,
            headers: {
                "Content-Type":
                    response.headers.get("content-type") ||
                    "application/json"
            }
        });

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

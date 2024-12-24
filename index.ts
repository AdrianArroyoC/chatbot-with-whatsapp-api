import { serve } from "bun";

const {
  WEBHOOK_VERIFY_TOKEN,
  GRAPH_API_TOKEN,
  PORT,
  BUSINESS_PHONE,
  API_VERSION
} = process.env;

serve({
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const method = req.method;

    if (url.pathname === "/webhook" && method === "POST") {
      const body = await req.json();

      // log incoming messages
      console.log("Incoming webhook message:", JSON.stringify(body, null, 2));

      // check if the webhook request contains a message
      // details on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
      const message = body.entry?.[0]?.changes[0]?.value?.messages?.[0];

      // check if the incoming message contains text
      if (message?.type === "text") {
        // extract the business number to send the reply from it
        // const business_phone_number_id = body.entry?.[0].changes?.[0].value?.metadata?.phone_number_id;

        const to = message.from.startsWith("521") ? message.from.replace("521", "52") : message.from;
        // send a reply message as per the docs here https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
        await fetch(
          `https://graph.facebook.com/${API_VERSION}/${BUSINESS_PHONE}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${GRAPH_API_TOKEN}`,
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to,
              text: { body: "Echo: " + message.text.body },
              context: {
                message_id: message.id // shows the message as a reply to the original user message
              },
            }),
          }
        );

        // mark incoming message as read
        await fetch(
          `https://graph.facebook.com/${API_VERSION}/${BUSINESS_PHONE}/messages`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${GRAPH_API_TOKEN}`,
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              status: "read",
              message_id: message.id,
            }),
          }
        );
      }

      return new Response(null, { status: 200 });
    }

    // accepts GET requests at the /webhook endpoint. You need this URL to setup webhook initially.
    // info on verification request payload: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
    if (url.pathname === "/webhook" && method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      // check the mode and token sent are correct
      if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
        console.log("Webhook verified successfully!");
        // respond with 200 OK and challenge token from the request
        return new Response(challenge, { status: 200 });
      } else {
        // respond with '403 Forbidden' if verify tokens do not match
        return new Response(null, { status: 403 });
      }
    }

    // Endpoint para GET /
    if (url.pathname === "/" && method === "GET") {
      return new Response(
        `<pre>Nothing to see here. Checkout README.md to start.</pre>`,
        { headers: { "Content-Type": "text/html" }, status: 200 }
      );
    }

    // Respuesta por defecto para rutas no encontradas
    return new Response("Not Found", { status: 404 });
  },
  port: PORT || 3000
});


console.log(`Server is running at http://localhost:${PORT}/`);
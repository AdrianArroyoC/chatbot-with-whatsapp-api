import config from '../config/env';
import messageHandler from '../services/messageHandler';

class WebhookController {
  async handleIncoming(req: Request): Promise<Response> {
    const body = await req.json();

    // check if the webhook request contains a message
    // details on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
    const message = body!.entry?.[0]?.changes[0]?.value?.messages?.[0];
    if (message) {
      await messageHandler.handleIncomingMessage(message);
    }

    return new Response('OK', { status: 200 });
  }

  async verifyWebhook(req: Request): Promise<Response> {
    const url = new URL(req.url);

    // accepts GET requests at the /webhook endpoint. You need this URL to setup webhook initially.
    // info on verification request payload: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && token === config.WEBHOOK_VERIFY_TOKEN) {
      console.log("Webhook verified successfully!");
      return new Response(challenge, { status: 200 });
    } else {
      return new Response(null, { status: 403 });
    }
  }
}

export default new WebhookController();
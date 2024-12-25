import config from '../config/env';
const { API_VERSION, BUSINESS_PHONE, GRAPH_API_TOKEN } = config;

class WhatsappService {
  async sendMessage(from: string, body: string, messageId: string): Promise<void> {
    const to = from.startsWith("521") ? from.replace("521", "52") : from;

    try {
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
            text: { body },
            context: {
              message_id: messageId // shows the message as a reply to the original user message
            },
          }),
        }
      );
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  async makAsRead(messageId: string): Promise<void> {
    try {
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
            message_id: messageId,
          }),
        }
      );
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  }
}

export default new WhatsappService();
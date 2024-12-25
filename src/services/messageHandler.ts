import WhatsappService from './whatsappService';

class MessageHandler {
  async handleIncomingMessage(message: any) {
    if (message?.type === 'text') {
      const response = `Echo: ${message.text.body}`;
      await WhatsappService.sendMessage(message.from, response, message.id);
      await WhatsappService.makAsRead(message.id);
    }
  }
}

export default new MessageHandler();
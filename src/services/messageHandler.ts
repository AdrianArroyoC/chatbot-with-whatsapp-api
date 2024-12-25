import WhatsappService from './whatsappService';

export type Message = {
  from: string;
  id: string;
  timestamp: string;
  text: {
    body: string;
  };
  type: string;
};

export type SenderInfo = {
  profile: {
    name: string;
  };
  wa_id: string;
};

class MessageHandler {
  async handleIncomingMessage(message: Message, senderInfo: SenderInfo): Promise<void> {
    if (message?.type === 'text') {
      const incomingMessage = message.text.body.toLowerCase().trim();

      if (this.isGreeting(incomingMessage)) {
        await this.sendWelcomeMessage(message.from, message.id);
      }
      else {
        const response = `Echo: ${message.text.body}`;
        await WhatsappService.sendMessage(message.from, response, message.id);
      }

      await WhatsappService.makAsRead(message.id);
    }
  }

  isGreeting(message: string): boolean {
    const greetings = ['hola', 'hey', 'buenas tardes', 'buenos días', 'buenas noches', 'buen día'];
    return greetings.some(greeting => message.includes(greeting));
  }

  async sendWelcomeMessage(to: string, messageId: string): Promise<void> {
    const welcomeMessage = '¡Hola! Bienvenido a nuestro servicio de veterinaria online. ¿En qué puedo ayudarte?';
    await WhatsappService.sendMessage(to, welcomeMessage, messageId);
  }
}

export default new MessageHandler();
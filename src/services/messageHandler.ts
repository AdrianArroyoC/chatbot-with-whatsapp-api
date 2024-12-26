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

export type Button = {
  type: string;
  reply: {
    id: string;
    title: string;
  };
}

class MessageHandler {
  async handleIncomingMessage(message: Message, senderInfo: SenderInfo): Promise<void> {
    const to = message.from.startsWith("521") ? message.from.replace("521", "52") : message.from;

    if (message?.type === 'text') {
      const incomingMessage = message.text.body.toLowerCase().trim();

      if (this.isGreeting(incomingMessage)) {
        await this.sendWelcomeMessage(to, message.id, senderInfo);
        await this.sendWelcomeMenu(to);
      }
      else {
        const response = `Echo: ${message.text.body}`;
        await WhatsappService.sendMessage(to, response, message.id);
      }

      await WhatsappService.makAsRead(message.id);
    }
  }

  isGreeting(message: string): boolean {
    const greetings = ['hola', 'hey', 'buenas tardes', 'buenos días', 'buenas noches', 'buen día'];
    return greetings.some(greeting => message.includes(greeting));
  }

  async sendWelcomeMessage(to: string, messageId: string, senderInfo: SenderInfo): Promise<void> {
    const name = this.getSenderName(senderInfo);
    const welcomeMessage = `Hola ${name}, Bienvenido MEDPET. ¿En qué puedo ayudarte?`.replace(/\s+/g, ' ');
    await WhatsappService.sendMessage(to, welcomeMessage, messageId);
  }

  getSenderName(senderInfo: SenderInfo): string {
    const name = senderInfo?.profile?.name;
    if (name) {
      const firstName = name.match(/\b\w+\b/);
      return firstName ? firstName[0] : '';
    }
    return senderInfo?.wa_id || '';
  }

  async sendWelcomeMenu(to: string): Promise<void> {
    const menuMessage = 'Elige una opción';
    const buttons: Button[] = [
      {
        type: 'reply',
        reply: {
          id: 'option1',
          title: 'Agendar',
        },
      },
      {
        type: 'reply',
        reply: {
          id: 'option2',
          title: 'Consultar',
        },
      },
      {
        type: 'reply',
        reply: {
          id: 'option3',
          title: 'Ubicación',
        },
      },
    ];

    await WhatsappService.sendInteractiveButtons(to, menuMessage, buttons);
  }
}

export default new MessageHandler();
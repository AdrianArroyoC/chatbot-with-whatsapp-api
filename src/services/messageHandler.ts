import WhatsappService from './whatsappService';

export type MessageTypes =
  'text' |
  'reaction' |
  'interactive' |
  'image' |
  'audio' |
  'document' |
  'sticker' |
  'video' |
  'contacts' |
  'location' |
  'template' |
  'interactive';

export type IncomingMessage = {
  from: string;
  id: string;
  timestamp: string;
  text?: {
    body: string;
  };
  interactive?: {
    button_reply: {
      id: string;
      title: string;
    };
  };
  type?: MessageTypes;
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
  async handleIncomingMessage(message: IncomingMessage, senderInfo: SenderInfo): Promise<void> {
    const to = message.from.startsWith("521") ? message.from.replace("521", "52") : message.from;

    if (message?.type === 'text') {
      const incomingMessage = message.text!.body.toLowerCase().trim();

      if (this.isGreeting(incomingMessage)) {
        await this.sendWelcomeMessage(to, message.id, senderInfo);
        await this.sendWelcomeMenu(to);
      }
      else {
        const response = `Echo: ${message.text!.body}`;
        await WhatsappService.sendMessage(to, response, message.id);
      }

      await WhatsappService.makAsRead(message.id);
    } else if (message?.type === 'interactive') {
      const buttonReply = message?.interactive?.button_reply;
      const optionTitle = (buttonReply?.title || '').toLowerCase().trim();
      const optionId = buttonReply?.id || '';
      let type = 'title' as 'title' | 'id';
      let option = optionTitle;
      if (!optionTitle) {
        type = 'id';
        option = optionId;
      }

      await this.handleMenuOption(to, option, type);

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

  async handleMenuOption(to: string, option: string, optionType: 'title' | 'id'): Promise<void> {
    let response = 'Opción no válida';
    if (option === (optionType === 'title' ? 'agendar' : 'option1')) {
      response = 'Agendar Cita';
    }
    else if (option === (optionType === 'title' ? 'consultar' : 'option2')) {
      response = 'Realizar Consulta';
    }
    else if (optionType === 'title' ? option.match(/ubicaci[oó]n/) : option === 'option3') {
      response = 'Esta es Nuestra Ubicación';
    }

    await WhatsappService.sendMessage(to, response);
  }
}

export default new MessageHandler();
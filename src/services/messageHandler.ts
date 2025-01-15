import WhatsappService from './whatsappService';
import appendToSheet from './googleSheetsService';
import openAiService from './openAiService';

const MEDIA_TYPES = ['image', 'audio', 'document', 'sticker', 'video'] as const;
export type MediaMessageType = typeof MEDIA_TYPES[number];

export type MessageType =
  'text' |
  'reaction' |
  'interactive' |
  'contacts' |
  'location' |
  'template' |
  'interactive' & MediaMessageType;

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
  type?: MessageType;
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

type Step = 'name' | 'petName' | 'petType' | 'reason' | 'date' | 'time' | 'confirm' | 'done';

class MessageHandler {
  appointmentState: {
    [to: string]: {
      step: Step;
      name?: string;
      petName?: string;
      petType?: string;
      reason?: string;
      date?: string;
      time?: string;
    } | null;
  };

  assistantState: {
    [to: string]: {
      step: 'question';
    } | null;
  };

  constructor() {
    this.appointmentState = {};
    this.assistantState = {};
  }

  async handleIncomingMessage(incomingMessage: IncomingMessage, senderInfo: SenderInfo): Promise<void> {
    const to = incomingMessage.from.startsWith("521") ? incomingMessage.from.replace("521", "52") : incomingMessage.from;

    if (incomingMessage?.type === 'text') {
      const messageText = incomingMessage.text!.body.toLowerCase().trim();

      if (this.assistantState[to]) {
        await this.handleAssistantFlow(to, messageText);
      } else if (this.appointmentState[to]) {
        await this.handleAppointmentFlow(to, messageText);
      } else if (this.isGreeting(messageText)) {
        await this.sendWelcomeMessage(to, incomingMessage.id, senderInfo);
        await this.sendWelcomeMenu(to);
      } else if (MEDIA_TYPES.includes(messageText as MediaMessageType)) {
        await this.sendMedia(to, messageText as MediaMessageType);
      } else {
        const response = `Echo: ${incomingMessage.text!.body}`;
        await WhatsappService.sendMessage(to, response, incomingMessage.id);
      }

      await WhatsappService.makAsRead(incomingMessage.id);
    } else if (incomingMessage?.type === 'interactive') {
      const buttonReply = incomingMessage?.interactive?.button_reply;
      const optionTitle = (buttonReply?.title || '').toLowerCase().trim();
      const optionId = buttonReply?.id || '';
      let type = 'title' as 'title' | 'id';
      let option = optionTitle;
      if (!optionTitle) {
        type = 'id';
        option = optionId;
      }

      await this.handleMenuOption(to, option, type);

      await WhatsappService.makAsRead(incomingMessage.id);
    }
  }

  isGreeting(messageText: string): boolean {
    const greetings = ['hola', 'hey', 'buenas tardes', 'buenos días', 'buenas noches', 'buen día'];
    return greetings.some(greeting => messageText.includes(greeting));
  }

  getSenderName(senderInfo: SenderInfo): string {
    const name = senderInfo?.profile?.name;
    if (name) {
      const firstName = name.match(/\b\w+\b/);
      return firstName ? firstName[0] : '';
    }
    return senderInfo?.wa_id || '';
  }

  async sendWelcomeMessage(to: string, messageId: string, senderInfo: SenderInfo): Promise<void> {
    const name = this.getSenderName(senderInfo);
    const welcomeMessage = `Hola ${name}, Bienvenido MEDPET. ¿En qué puedo ayudarte?`.replace(/\s+/g, ' ');
    await WhatsappService.sendMessage(to, welcomeMessage, messageId);
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
    if (option === (optionType === 'title' ? 'Agendar' : 'option1')) {
      this.appointmentState[to] = { step: 'name' };
      response = 'Por favor ingresa tu nombre';
    }
    else if (option === (optionType === 'title' ? 'Consultar' : 'option2')) {
      this.assistantState[to] = { step: 'question' };
      response = 'Realizar Consulta';
    }
    else if (optionType === 'title' ? option.match(/Ubicaci[oó]n/) : option === 'option3') {
      response = 'Esta es Nuestra Ubicación';
    }
    else if (optionType === (optionType === 'title' ? 'Emergencia' : 'option8')) {
      await WhatsappService.sendMessage(to, 'Si es una emergencia, por favor llame a nuestra línea de atención');
      return await this.sendConctact(to);
    }

    await WhatsappService.sendMessage(to, response);
  }

  async sendMedia(to: string, type: MediaMessageType = 'image'): Promise<void> {
    const mediaMap = {
      audio: {
        mediaUrl: 'https://s3.amazonaws.com/gndx.dev/medpet-audio.aac',
        caption: 'Esto es un audio',
        type: 'audio',
      },
      video: {
        mediaUrl: 'https://s3.amazonaws.com/gndx.dev/medpet-video.mp4',
        caption: 'Esto es un video',
        type: 'video',
      },
      image: {
        mediaUrl: 'https://s3.amazonaws.com/gndx.dev/medpet-imagen.png',
        caption: 'Esto es una imagen',
        type: 'image',
      },
      document: {
        mediaUrl: 'https://s3.amazonaws.com/gndx.dev/medpet-file.pdf',
        caption: 'Esto es un documento',
        type: 'document',
      },
    };
    const { mediaUrl, caption } = mediaMap[type as keyof typeof mediaMap];
    await WhatsappService.sendMediaMessage(to, type, mediaUrl, caption);
  }

  completeAppointment(to: string): string {
    const appointment = this.appointmentState[to];
    delete this.appointmentState[to];

    const userData = [
      to,
      appointment!.name,
      appointment!.petName,
      appointment!.petType,
      appointment!.reason,
      appointment!.date,
      appointment!.time,
    ];

    appendToSheet(userData);

    return `Cita agendar, resumen de tu cita:

    Nombre: ${appointment!.name}
    Mascota: ${appointment!.petName}
    Tipo de mascota: ${appointment!.petType}
    Motivo: ${appointment!.reason}
    Fecha: ${appointment!.date}
    Hora: ${appointment!.time}`;
  }

  async handleAppointmentFlow(to: string, messageText: string): Promise<void> {
    const state = this.appointmentState[to];
    let response: string = 'Opción no válida';
    if (state!.step === 'name') {
      state!.name = messageText;
      state!.step = 'petName';
      response = '¿Cómo se llama tu mascota?';
    } else if (state!.step === 'petName') {
      state!.petName = messageText;
      state!.step = 'petType';
      response = '¿Qué tipo de mascota es? (Perro, Gato, etc.)';
    } else if (state!.step === 'petType') {
      state!.petType = messageText;
      state!.step = 'reason';
      response = '¿Cuál es el motivo de la consulta?';
    } else if (state!.step === 'reason') {
      state!.reason = messageText;
      state!.step = 'date';
      response = '¿Cuándo te gustaría agendar la cita?';
    } else if (state!.step === 'date') {
      state!.date = messageText;
      state!.step = 'time';
      response = '¿A qué hora te gustaría agendar la cita?';
    } else if (state!.step === 'time') {
      state!.time = messageText;
      state!.step = 'confirm';
      response = 'Confirma tu cita';
    } else if (state!.step === 'confirm') {
      if (messageText === 'Sí') {
        response = this.completeAppointment(to);
      } else {
        response = 'Cita cancelada';
        this.appointmentState[to] = null;
      }
    }

    if (state!.step === 'confirm') {
      await WhatsappService.sendInteractiveButtons(to, response, [
        {
          type: 'reply',
          reply: {
            id: 'option4',
            title: 'Sí',
          },
        },
        {
          type: 'reply',
          reply: {
            id: 'option5',
            title: 'No',
          },
        },
      ]);
    } else {
      await WhatsappService.sendMessage(to, response);
    }
  }

  async handleAssistantFlow(to: string, messageText: string): Promise<void> {
    const state = this.assistantState[to];
    let response: string = 'No entiendo tu pregunta';
    if (state!.step === 'question') {
      const openAiResponse = await openAiService(messageText);
      if (openAiResponse) {
        response = openAiResponse;
      }
    }

    delete this.assistantState[to];

    await WhatsappService.sendMessage(to, response);
    await WhatsappService.sendInteractiveButtons(to, '¿La respuesta fue de ayuda?', [
      {
        type: 'reply',
        reply: {
          id: 'option6',
          title: 'Sí, gracias',
        },
      },
      {
        type: 'reply',
        reply: {
          id: 'option7',
          title: 'No, otra pregunta',
        },
      },
      {
        type: 'reply',
        reply: {
          id: 'option8',
          title: 'Emergencia',
        },
      }
    ]);
  }

  async sendConctact(to: string): Promise<void> {
    const contact = {
      addresses: [
        {
          street: 'Av. Mariano Otero 1234',
          city: 'Guadalajata',
          state: 'Jalisco',
          country: 'México',
          country_code: 'MX',
          type: 'WORK',
        },
      ],
      birthday: '1990-01-01',
      emails: [
        {
          email: 'contacto@medpet.com',
          type: 'WORK',
        },
      ],
      name: {
        formatted_name: 'Medpet Contacto',
        first_name: 'Medpet',
        last_name: 'Contacto',
        middle_name: '',
        prefix: '',
        suffix: '',
      },
      org: {
        company: 'Medpet',
        department: 'Atención a cliente',
        title: 'Contacto'
      },
      phones: [
        {
          phone: '+525555555555',
          wa_id: '525555555555',
          type: 'WORK',
        },
      ],
      urls: [
        {
          url: 'https://medpet.com',
          type: 'WORK',
        },
      ],
    }
    await WhatsappService.sendContactMessage(to, contact);
  }
}

export default new MessageHandler();
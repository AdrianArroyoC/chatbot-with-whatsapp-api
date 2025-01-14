import OpenAI from "openai";
import config from '../config/env';

const { CHATGPT_API_KEY } = config;

const client = new OpenAI({
  apiKey: CHATGPT_API_KEY
});

const openAiService = async (message: string) => {
  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: message }
      ]
    });
    return response.choices[0].message.content;
  } catch (error) {
    console.error("Error sending message:", error);
  }
}

export default openAiService;
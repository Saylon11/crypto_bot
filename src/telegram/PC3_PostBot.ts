

import { FastifyInstance } from 'fastify';
import axios from 'axios';
import { TelePostPayload } from '../types';

export default async function (fastify: FastifyInstance) {
  fastify.post('/sendMeme', async (request, reply) => {
    const { file_url, caption, channel_id } = request.body as TelePostPayload;

    try {
      const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
      if (!TELEGRAM_BOT_TOKEN) {
        throw new Error('Missing TELEGRAM_BOT_TOKEN in environment variables');
      }

      const telegramApiUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendVideo`;

      const response = await axios.post(telegramApiUrl, {
        chat_id: channel_id,
        video: file_url,
        caption,
        parse_mode: 'HTML',
      });

      reply.send({ success: true, result: response.data });
    } catch (error) {
      console.error('[PC3_PostBot] Error sending meme:', error);
      reply.status(500).send({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });
}
import { FastifyPluginAsync } from 'fastify'

const sendMemeTelegram: FastifyPluginAsync = async (fastify) => {
  fastify.post('/telepostbot/sendMeme', async (request, reply) => {
    const { imageUrl, caption } = request.body as { imageUrl?: string; caption?: string }

    if (!imageUrl) {
      return reply.status(400).send({ error: 'Missing imageUrl' })
    }

    // Replace this with your Discord logic
    console.log('📨 Telegram meme relay received:', { imageUrl, caption })

    return reply.send({ success: true, message: 'Meme sent to Telegram (simulated).' })
  })
}

export default sendMemeTelegram
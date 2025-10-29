import { FastifyPluginAsync } from 'fastify'

const postMemeX: FastifyPluginAsync = async (fastify) => {
  fastify.post('/xpostbot/postMeme', async (request, reply) => {
    const { imageUrl, caption } = request.body as { imageUrl?: string; caption?: string }

    if (!imageUrl) {
      return reply.status(400).send({ error: 'Missing imageUrl' })
    }

    // Replace this with X posting logic via API
    console.log('🐦 X meme poster received:', { imageUrl, caption })

    return reply.send({ success: true, message: 'Meme posted to X (simulated).' })
  })
}

export default postMemeX
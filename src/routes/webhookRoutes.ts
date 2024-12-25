import WebhookController from '../controllers/webhooksController';

const router = async (req: Request): Promise<Response> => {
  const method = req.method;

  if (method === 'POST') {
    return WebhookController.handleIncoming(req);
  }

  if (method === 'GET') {
    return WebhookController.verifyWebhook(req);
  }

  return new Response('Not Found', { status: 404 });
}

export default router;
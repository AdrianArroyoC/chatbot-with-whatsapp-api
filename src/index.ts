import { serve } from "bun";

import webhookRoutes from "./routes/webhookRoutes";
import config from './config/env';

serve({
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const method = req.method;

    if (url.pathname === "/webhook") {
      const response = await webhookRoutes(req);
      return response;
    }
    if (url.pathname === "/" && method === "GET") {
      return new Response(
        `<pre>Nothing to see here. Checkout README.md to start.</pre>`,
        { headers: { "Content-Type": "text/html" }, status: 200 }
      );
    }

    return new Response("Not Found", { status: 404 });
  },
  port: config.PORT
});


console.log(`Server is running at http://localhost:${config.PORT}/`);
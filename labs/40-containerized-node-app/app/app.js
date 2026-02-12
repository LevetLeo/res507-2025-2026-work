import Fastify from "fastify";
import formbody from "@fastify/formbody";
import view from "@fastify/view";
import handlebars from "handlebars";
import postgres from "@fastify/postgres";

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(postgres, {
    connectionString: process.env.DATABASE_URL ?? 'postgres://postgres@localhost/postgres'
  });
  await app.register(formbody);
  await app.register(view, {
    engine: { handlebars: handlebars },
    root: new URL("./views/", import.meta.url).pathname
  });

  app.get("/health", async () => ({ ok: true }));

  app.get("/", async (_req, reply) => {
    const quotes = [{text: "quote 1", author: "author 1"}, {text: "quote 2", author: "author 2"}]; 
    return reply.view("index.hbs", { quotes });
  });

  app.post("/quotes", async (req, reply) => {
    const author = (req.body?.author ?? "").trim();
    const text = (req.body?.text ?? "").trim();

    if (!text) return reply.redirect("/");

    app.log.info({quote: { author: author || "anonymous", text }}, 'New quote added');
    return reply.redirect("/");
  });


  app.get("/stress", async (req, reply) => {
    const type = req.query.type || "cpu"; 
    const duration = parseInt(req.query.duration) || 10; 
  
    if (type === "cpu") {
      const start = Date.now();
      while ((Date.now() - start) / 3000 < duration) {
        Math.sqrt(Math.random() * 1000000); 
      }
      return { status: "CPU stress done" };
    }
  
    if (type === "mem") {
      const arr = [];
      try {
        while (true) {
          arr.push("x".repeat(1024 * 1024)); // 1MB par itération
        }
      } catch (e) {
        return { status: "Memory limit hit", error: e.message };
      }
    }
  
    return { status: "unknown type" };
  });
  
  return app;
}

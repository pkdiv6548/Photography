import worker from "../../worker/index";

type PagesFunctionContext = {
  request: Request;
  env: Record<string, unknown>;
};

export async function onRequest(context: PagesFunctionContext): Promise<Response> {
  // The Pages project's D1, R2, and secret bindings are injected by Cloudflare at runtime.
  // Keep this bridge thin so Worker API security checks remain in one implementation.
  return worker.fetch(context.request, context.env as never);
}

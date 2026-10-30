import worker from "../../worker/index";

type PagesFunctionContext = {
  request: Request;
  env: Record<string, unknown>;
};

/**
 * Pages Functions catch-all API bridge.
 * Keep API behavior in the Worker so auth and validation are not duplicated.
 * The deployment must explicitly provide the DB binding and ADMIN_SETUP_SECRET.
 */
export async function onRequest(context: PagesFunctionContext): Promise<Response> {
  return worker.fetch(context.request, context.env as never);
}

// Talks to Polar (our payment provider) with plain fetch: no SDK, nothing to install.
// Server-side only: it uses the secret access token. Pass `env` and `fetchImpl` in tests.

export class BillingError extends Error {
  constructor(status, message) {
    super(message);
    this.name = "BillingError";
    this.status = status;
  }
}

export const INTERVALS = ["month", "year"];

// Where Polar sends people after paying. Relative to the app's origin.
export const SUCCESS_PATH = "/dashboard?upgraded=1";
export const PORTAL_RETURN_PATH = "/dashboard";

const BASE_URLS = { sandbox: "https://sandbox-api.polar.sh", production: "https://api.polar.sh" };

/** Reads and checks the settings. Throws a BillingError that names what's missing (never the values). */
export function readPolarEnv(env = process.env, { need = ["POLAR_ACCESS_TOKEN"] } = {}) {
  const missing = need.filter((key) => !env[key]);
  if (missing.length > 0) {
    console.error(`Billing is not configured. Missing: ${missing.join(", ")}`);
    throw new BillingError(503, "Payments aren't set up yet. Please try again later.");
  }
  const server = env.POLAR_SERVER === "production" ? "production" : "sandbox";
  return {
    token: env.POLAR_ACCESS_TOKEN,
    server,
    baseUrl: BASE_URLS[server],
    webhookSecret: env.POLAR_WEBHOOK_SECRET,
    products: { month: env.POLAR_PRODUCT_MONTHLY, year: env.POLAR_PRODUCT_YEARLY },
    appUrl: (env.NEXT_PUBLIC_APP_URL || "").replace(/\/+$/, ""),
  };
}

/** The product ids we sell. Webhook events about any other product are ignored. */
export const productIds = (env = process.env) => [env.POLAR_PRODUCT_MONTHLY, env.POLAR_PRODUCT_YEARLY].filter(Boolean);

async function polarRequest({ config, fetchImpl, path, body }) {
  let response;
  try {
    response = await fetchImpl(`${config.baseUrl}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error("Polar request failed:", error);
    throw new BillingError(502, "Couldn't reach the payment provider. Please try again.");
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    console.error(`Polar ${path} answered ${response.status}: ${text.slice(0, 500)}`);
    throw new BillingError(response.status === 404 ? 404 : 502, response.status === 404 ? "No subscription was found for this account." : "The payment provider couldn't start that. Please try again.");
  }
  return response.json();
}

/**
 * Starts a hosted checkout. `uid` becomes Polar's external customer id, which is how the webhook
 * knows whose account to upgrade. Returns { url, id }: send the browser to `url`.
 */
export async function createCheckout({ uid, email, interval, origin, env = process.env, fetchImpl = fetch }) {
  if (!INTERVALS.includes(interval)) throw new BillingError(400, "Choose monthly or yearly billing.");
  if (!uid) throw new BillingError(401, "Please sign in first.");

  const config = readPolarEnv(env, { need: ["POLAR_ACCESS_TOKEN", interval === "year" ? "POLAR_PRODUCT_YEARLY" : "POLAR_PRODUCT_MONTHLY"] });
  const base = config.appUrl || origin;
  if (!base) throw new BillingError(500, "Couldn't work out the site address.");

  const checkout = await polarRequest({
    config,
    fetchImpl,
    path: "/v1/checkouts/",
    body: {
      products: [config.products[interval]],
      external_customer_id: uid,
      ...(email && { customer_email: email }),
      success_url: `${base}${SUCCESS_PATH}`,
      return_url: `${base}${PORTAL_RETURN_PATH}`,
      metadata: { uid, interval },
    },
  });
  if (!checkout?.url) throw new BillingError(502, "The payment provider sent back no checkout link.");
  return { url: checkout.url, id: checkout.id };
}

/** A link to Polar's customer portal: change card, cancel, download invoices. */
export async function createPortalSession({ uid, origin, env = process.env, fetchImpl = fetch }) {
  if (!uid) throw new BillingError(401, "Please sign in first.");
  const config = readPolarEnv(env);
  const base = config.appUrl || origin;

  const session = await polarRequest({
    config,
    fetchImpl,
    path: "/v1/customer-sessions/",
    body: { external_customer_id: uid, ...(base && { return_url: `${base}${PORTAL_RETURN_PATH}` }) },
  });
  if (!session?.customer_portal_url) throw new BillingError(502, "The payment provider sent back no portal link.");
  return { url: session.customer_portal_url };
}

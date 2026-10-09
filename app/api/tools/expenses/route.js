import { adminDb } from "@/lib/firebaseAdmin";
import { createExpense, listExpenseData } from "@/lib/tools/expenseService";
import { readJson, requireUser, route } from "@/lib/zone/http";

/** GET /api/tools/expenses → { buckets, expenses, truncated } (the signed-in user's own) */
export const GET = route(async (request) => {
  const { uid } = await requireUser(request);
  return Response.json(await listExpenseData({ db: adminDb, uid }));
});

/** POST /api/tools/expenses { title, amount, currency, date?, note?, bucketId?, tripId? } → { expense } */
export const POST = route(async (request) => {
  const { uid } = await requireUser(request);
  const input = await readJson(request);
  const expense = await createExpense({ db: adminDb, uid, input });
  return Response.json({ expense }, { status: 201 });
});

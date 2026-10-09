import { adminDb } from "@/lib/firebaseAdmin";
import { deleteExpense, updateExpense } from "@/lib/tools/expenseService";
import { readJson, requireUser, route } from "@/lib/zone/http";

/** PATCH /api/tools/expenses/:id { ...changed fields } → { expense } */
export const PATCH = route(async (request, { params }) => {
  const { uid } = await requireUser(request);
  const { id } = await params;
  const input = await readJson(request);
  const expense = await updateExpense({ db: adminDb, uid, expenseId: id, input });
  return Response.json({ expense });
});

/** DELETE /api/tools/expenses/:id → { ok: true } */
export const DELETE = route(async (request, { params }) => {
  const { uid } = await requireUser(request);
  const { id } = await params;
  return Response.json(await deleteExpense({ db: adminDb, uid, expenseId: id }));
});

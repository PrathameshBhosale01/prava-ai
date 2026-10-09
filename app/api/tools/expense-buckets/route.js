import { adminDb } from "@/lib/firebaseAdmin";
import { createBucket } from "@/lib/tools/expenseService";
import { readJson, requireUser, route } from "@/lib/zone/http";

/** POST /api/tools/expense-buckets { title } → { bucket } */
export const POST = route(async (request) => {
  const { uid } = await requireUser(request);
  const input = await readJson(request);
  const bucket = await createBucket({ db: adminDb, uid, input });
  return Response.json({ bucket }, { status: 201 });
});

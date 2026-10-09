import { adminDb } from "@/lib/firebaseAdmin";
import { deleteBucket } from "@/lib/tools/expenseService";
import { requireUser, route } from "@/lib/zone/http";

/** DELETE /api/tools/expense-buckets/:id → { moved } (its expenses move to General) */
export const DELETE = route(async (request, { params }) => {
  const { uid } = await requireUser(request);
  const { id } = await params;
  return Response.json(await deleteBucket({ db: adminDb, uid, bucketId: id }));
});

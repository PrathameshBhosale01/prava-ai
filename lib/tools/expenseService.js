import { badRequest, notFound } from "../zone/errors.js";
import {
  ID_PATTERN,
  LIMITS,
  validateBucketTitle,
  validateExpenseInput,
} from "./expenseValidation.js";

// Firestore layout (all access goes through the Admin SDK on the server):
//   users/{uid}/expense_buckets/{bucketId}   { title, createdAt }
//   users/{uid}/expenses/{expenseId}         { title, amount, currency, date, note,
//                                              bucketId|null, tripId|null, createdAt, updatedAt }
//   trips/{tripId}                           (existing) only read, to check ownership
//
// `uid` always comes from the verified ID token, never from the request body, and
// every path below is built from it, so one user can never reach another's data.
// `db` is injected so tests can pass a fake.

const BATCH_SIZE = 400; // Firestore allows 500 writes per batch

function assertId(id, what) {
  if (typeof id !== "string" || !ID_PATTERN.test(id)) throw notFound(what);
  return id;
}

const userRef = (db, uid) => db.collection("users").doc(assertId(uid, "User"));
const bucketsOf = (db, uid) => userRef(db, uid).collection("expense_buckets");
const expensesOf = (db, uid) => userRef(db, uid).collection("expenses");

const iso = (value) => {
  const date = value?.toDate ? value.toDate() : value;
  return date instanceof Date ? date.toISOString() : null;
};

const toBucket = (doc) => {
  const data = doc.data();
  return { id: doc.id, title: data.title, createdAt: iso(data.createdAt) };
};

const toExpense = (doc) => {
  const data = doc.data();
  return {
    id: doc.id,
    title: data.title,
    amount: data.amount,
    currency: data.currency,
    date: data.date,
    note: data.note ?? "",
    bucketId: data.bucketId ?? null,
    tripId: data.tripId ?? null,
    createdAt: iso(data.createdAt),
  };
};

function throwIfInvalid(errors) {
  if (Object.keys(errors).length > 0) {
    throw badRequest("Please fix the highlighted fields.", errors);
  }
}

/** Both links are optional, but if given they must belong to this user. */
async function checkLinks({ db, uid, bucketId, tripId }) {
  const errors = {};

  if (bucketId && !(await bucketsOf(db, uid).doc(bucketId).get()).exists) {
    errors.bucketId = "That bucket no longer exists.";
  }

  if (tripId) {
    const trip = await db.collection("trips").doc(tripId).get();
    // Same message for "missing" and "someone else's" so ids can't be probed.
    if (!trip.exists || trip.data().userId !== uid) errors.tripId = "That trip isn't available.";
  }

  throwIfInvalid(errors);
}

// -------------------------------------------------------------- reading

export async function listExpenseData({ db, uid }) {
  const [bucketSnap, expenseSnap] = await Promise.all([
    bucketsOf(db, uid).orderBy("createdAt", "asc").get(),
    expensesOf(db, uid).orderBy("createdAt", "desc").limit(LIMITS.listMax).get(),
  ]);

  return {
    buckets: bucketSnap.docs.map(toBucket),
    expenses: expenseSnap.docs.map(toExpense),
    truncated: expenseSnap.docs.length >= LIMITS.listMax,
  };
}

// -------------------------------------------------------------- buckets

export async function createBucket({ db, uid, input, now = new Date() }) {
  const { value: title, error } = validateBucketTitle(input?.title);
  if (error) throw badRequest(error, { title: error });

  const existing = await bucketsOf(db, uid).get();
  if (existing.docs.length >= LIMITS.bucketsPerUser) {
    throw badRequest(`You can have up to ${LIMITS.bucketsPerUser} buckets.`);
  }

  const taken = existing.docs.some((doc) => doc.data().title.toLowerCase() === title.toLowerCase());
  if (taken) {
    throw badRequest("A bucket with that name already exists.", {
      title: "A bucket with that name already exists.",
    });
  }

  const ref = bucketsOf(db, uid).doc();
  await ref.set({ title, createdAt: now });
  return { id: ref.id, title, createdAt: now.toISOString() };
}

/** Deleting a bucket keeps its expenses: they move to "General". */
export async function deleteBucket({ db, uid, bucketId }) {
  const ref = bucketsOf(db, uid).doc(assertId(bucketId, "Bucket"));
  if (!(await ref.get()).exists) throw notFound("Bucket");

  const affected = await expensesOf(db, uid).where("bucketId", "==", bucketId).get();

  for (let start = 0; start < affected.docs.length; start += BATCH_SIZE) {
    const batch = db.batch();
    affected.docs.slice(start, start + BATCH_SIZE).forEach((doc) => batch.update(doc.ref, { bucketId: null }));
    await batch.commit();
  }

  await ref.delete();
  return { moved: affected.docs.length };
}

// ------------------------------------------------------------- expenses

export async function createExpense({ db, uid, input, now = new Date(), today }) {
  const { value, errors } = validateExpenseInput(input, today ? { today } : undefined);
  throwIfInvalid(errors);
  await checkLinks({ db, uid, bucketId: value.bucketId, tripId: value.tripId });

  const ref = expensesOf(db, uid).doc();
  await ref.set({ ...value, createdAt: now, updatedAt: now });
  return { id: ref.id, ...value, createdAt: now.toISOString() };
}

const EDITABLE = ["title", "amount", "currency", "date", "note", "bucketId", "tripId"];

/** Partial update: send only the fields that changed ({ tripId: null } unlinks). */
export async function updateExpense({ db, uid, expenseId, input, now = new Date(), today }) {
  const ref = expensesOf(db, uid).doc(assertId(expenseId, "Expense"));
  const snap = await ref.get();
  if (!snap.exists) throw notFound("Expense");

  const current = toExpense(snap);
  const changes = {};
  for (const key of EDITABLE) {
    if (input && Object.hasOwn(input, key)) changes[key] = input[key];
  }

  const { value, errors } = validateExpenseInput({ ...current, ...changes }, today ? { today } : undefined);
  throwIfInvalid(errors);

  await checkLinks({
    db,
    uid,
    bucketId: value.bucketId !== current.bucketId ? value.bucketId : null,
    tripId: value.tripId !== current.tripId ? value.tripId : null,
  });

  await ref.update({ ...value, updatedAt: now });
  return { ...current, ...value };
}

export async function deleteExpense({ db, uid, expenseId }) {
  const ref = expensesOf(db, uid).doc(assertId(expenseId, "Expense"));
  if (!(await ref.get()).exists) throw notFound("Expense");
  await ref.delete();
  return { ok: true };
}

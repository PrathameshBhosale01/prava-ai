import { adminAuth } from "@/lib/firebaseAdmin";

export async function verifyIdToken(token) {
  if (!token) {
    throw new Error("Missing authentication token");
  }

  const decodedToken =
    await adminAuth.verifyIdToken(token);

  return decodedToken;
}
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { previewOf, toStoredMessage } from "@/lib/assistant/chatUtils";

// Firestore layout (all owned by the signed-in user):
//   users/{uid}/chats/{chatId}                 { title, createdAt, updatedAt, preview }
//   users/{uid}/chats/{chatId}/messages/{id}   { role, content, createdAt, plan?, error?, stopped? }
// Messages live in a subcollection so listing chats never downloads their content.

const MAX_CHATS = 40;
const MAX_MESSAGES = 300;

const chatRef = (uid, chatId) => doc(db, "users", uid, "chats", chatId);
const messagesRef = (uid, chatId) => collection(chatRef(uid, chatId), "messages");

// Firestore rejects `undefined`; a JSON round trip removes it from nested data.
const toPlain = (value) => JSON.parse(JSON.stringify(value));

export async function listChats(uid) {
  const snapshot = await getDocs(
    query(collection(db, "users", uid, "chats"), orderBy("updatedAt", "desc"), limit(MAX_CHATS)),
  );

  return snapshot.docs.map((document) => {
    const data = document.data();
    return {
      id: document.id,
      title: data.title || "New chat",
      preview: data.preview || "",
      createdAt: data.createdAt ?? 0,
      updatedAt: data.updatedAt ?? 0,
    };
  });
}

export async function loadMessages(uid, chatId) {
  const snapshot = await getDocs(
    query(messagesRef(uid, chatId), orderBy("createdAt", "asc"), limit(MAX_MESSAGES)),
  );
  return snapshot.docs.map((document) => ({ ...document.data(), id: document.id }));
}

/**
 * Saves one exchange (the user's message + the assistant's reply) and bumps
 * the chat's metadata, atomically.
 */
export async function saveExchange({ uid, chatId, isNew, title, messages }) {
  const now = Date.now();
  const lastReply = [...messages].reverse().find((message) => message.role === "assistant");
  const preview = previewOf(lastReply?.content);

  const batch = writeBatch(db);
  batch.set(
    chatRef(uid, chatId),
    isNew ? { title, createdAt: now, updatedAt: now, preview } : { updatedAt: now, preview },
    { merge: true },
  );
  for (const message of messages) {
    batch.set(doc(messagesRef(uid, chatId), message.id), toPlain(toStoredMessage(message)));
  }
  await batch.commit();

  return { updatedAt: now, preview };
}

export async function updateMessage(uid, chatId, messageId, patch) {
  await updateDoc(doc(messagesRef(uid, chatId), messageId), toPlain(patch));
}

export async function deleteMessage(uid, chatId, messageId) {
  const batch = writeBatch(db);
  batch.delete(doc(messagesRef(uid, chatId), messageId));
  await batch.commit();
}

export async function renameChat(uid, chatId, title) {
  await updateDoc(chatRef(uid, chatId), { title });
}

/** Deletes a chat and all of its messages. */
export async function deleteChat(uid, chatId) {
  const snapshot = await getDocs(messagesRef(uid, chatId));

  // A batch holds at most 500 writes.
  for (let start = 0; start < snapshot.docs.length; start += 400) {
    const batch = writeBatch(db);
    snapshot.docs.slice(start, start + 400).forEach((document) => batch.delete(document.ref));
    await batch.commit();
  }

  const batch = writeBatch(db);
  batch.delete(chatRef(uid, chatId));
  await batch.commit();
}
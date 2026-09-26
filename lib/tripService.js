import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
  serverTimestamp,
} from "firebase/firestore";

import { db } from "@/lib/firebase";

export async function createTrip(userId, tripData) {
  const tripsRef = collection(db, "trips");

  const trip = {
    ...tripData,
    userId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const docRef = await addDoc(tripsRef, trip);

  return docRef.id;
}

export async function getUserTrips(userId) {
  const tripsRef = collection(db, "trips");

  const tripsQuery = query(
    tripsRef,
    where("userId", "==", userId)
  );

  const snapshot = await getDocs(tripsQuery);

  return snapshot.docs.map((document) => ({
    id: document.id,
    ...document.data(),
  }));
}

export async function getTrip(tripId) {
  const tripRef = doc(db, "trips", tripId);

  const snapshot = await getDoc(tripRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
}

export async function updateTrip(tripId, tripData) {
  const tripRef = doc(db, "trips", tripId);

  await updateDoc(tripRef, {
    ...tripData,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTrip(tripId) {
  const tripRef = doc(db, "trips", tripId);

  await deleteDoc(tripRef);
}
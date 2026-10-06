"use client";

import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, query, serverTimestamp, setDoc, where } from "firebase/firestore";

import { db } from "@/lib/firebase"; // <- adjust if your Firestore export lives elsewhere
import { normalizeTrip } from "@/lib/insights";

/**
 * Live trips + budget goal for one user.
 *   trips   -> top-level `trips` collection, filtered by userId
 *   goal    -> user/{uid}.budgetGoal.amount
 * No orderBy on purpose, so no composite index is needed (sorted client-side).
 */
export function useInsightsData(uid) {
  const [trips, setTrips] = useState([]);
  const [goal, setGoal] = useState(null);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [goalLoading, setGoalLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!uid) return;

    const stopTrips = onSnapshot(
      query(collection(db, "trips"), where("userId", "==", uid)),
      (snap) => {
        setTrips(snap.docs.map((d) => normalizeTrip({ id: d.id, ...d.data() })));
        setTripsLoading(false);
      },
      (err) => {
        setError(err);
        setTripsLoading(false);
      }
    );

    const stopGoal = onSnapshot(
      doc(db, "user", uid),
      (snap) => {
        setGoal(snap.data()?.budgetGoal?.amount ?? null);
        setGoalLoading(false);
      },
      (err) => {
        setError(err);
        setGoalLoading(false);
      }
    );

    return () => {
      stopTrips();
      stopGoal();
    };
  }, [uid]);

  return { trips, goal, error, loading: !uid || tripsLoading || goalLoading };
}

export function saveBudgetGoal(uid, amount) {
  return setDoc(
    doc(db, "user", uid),
    { budgetGoal: { amount, currency: "INR", updatedAt: serverTimestamp() } },
    { merge: true }
  );
}

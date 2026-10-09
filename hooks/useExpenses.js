"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import {
  createBucketRequest,
  createExpenseRequest,
  deleteBucketRequest,
  deleteExpenseRequest,
  loadExpenseData,
  updateExpenseRequest,
} from "@/lib/tools/expenseClient";
import { getUserTrips } from "@/lib/tripService";

const EMPTY = { expenses: [], buckets: [], truncated: false };

/**
 * Expenses, buckets and the user's trips (for the optional trip link).
 * Writes update the screen immediately; failures roll back and rethrow so the
 * caller can show the message. Trips are best-effort: if they fail to load the
 * tracker still works, just without trip names.
 */
export function useExpenses() {
  const { user } = useAuth();
  const uid = user?.uid;

  const [state, setState] = useState({ status: "loading", error: null, ...EMPTY });
  const [trips, setTrips] = useState({ loaded: false, list: [] });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!uid) return undefined;
    let cancelled = false;

    loadExpenseData().then(
      (data) => {
        if (!cancelled) setState({ status: "ready", error: null, ...EMPTY, ...data });
      },
      (error) => {
        if (!cancelled) setState({ status: "error", error: error.message, ...EMPTY });
      }
    );

    getUserTrips(uid).then(
      (list) => {
        if (!cancelled) setTrips({ loaded: true, list });
      },
      () => {
        if (!cancelled) setTrips({ loaded: false, list: [] });
      }
    );

    return () => {
      cancelled = true;
    };
  }, [uid, attempt]);

  const reload = useCallback(() => {
    setState({ status: "loading", error: null, ...EMPTY });
    setAttempt((count) => count + 1);
  }, []);

  const addExpense = useCallback(async (input) => {
    const expense = await createExpenseRequest(input);
    setState((current) => ({ ...current, expenses: [expense, ...current.expenses] }));
    return expense;
  }, []);

  const saveExpense = useCallback(async (id, changes) => {
    const expense = await updateExpenseRequest(id, changes);
    setState((current) => ({
      ...current,
      expenses: current.expenses.map((item) => (item.id === id ? expense : item)),
    }));
    return expense;
  }, []);

  const removeExpense = useCallback(
    async (expense) => {
      setState((current) => ({
        ...current,
        expenses: current.expenses.filter((item) => item.id !== expense.id),
      }));
      try {
        await deleteExpenseRequest(expense.id);
      } catch (error) {
        setState((current) => ({ ...current, expenses: [expense, ...current.expenses] }));
        throw error;
      }
    },
    []
  );

  const addBucket = useCallback(async (title) => {
    const bucket = await createBucketRequest(title);
    setState((current) => ({ ...current, buckets: [...current.buckets, bucket] }));
    return bucket;
  }, []);

  const removeBucket = useCallback(async (bucketId) => {
    const result = await deleteBucketRequest(bucketId);
    setState((current) => ({
      ...current,
      buckets: current.buckets.filter((bucket) => bucket.id !== bucketId),
      expenses: current.expenses.map((item) =>
        item.bucketId === bucketId ? { ...item, bucketId: null } : item
      ),
    }));
    return result;
  }, []);

  return {
    ...state,
    trips: trips.list,
    tripsLoaded: trips.loaded,
    reload,
    addExpense,
    saveExpense,
    removeExpense,
    addBucket,
    removeBucket,
  };
}

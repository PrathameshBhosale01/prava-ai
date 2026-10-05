// Shared test doubles. Not a test file itself (no .test. in the name).

// Minimal in-memory stand-in for the Admin SDK Firestore API we use.
// Transactions are serialised, which is the guarantee Firestore gives us.
export function fakeDb(initial = {}) {
  const store = new Map(Object.entries(initial));
  let queue = Promise.resolve();
  const refOf = (id) => ({
    id,
    get: async () => ({ exists: store.has(id), data: () => structuredClone(store.get(id)) }),
  });
  return {
    store,
    collection: () => ({ doc: refOf }),
    runTransaction: (fn) => {
      const run = queue.then(() =>
        fn({
          get: (ref) => ref.get(),
          set: (ref, data, opts) => store.set(ref.id, opts?.merge ? { ...store.get(ref.id), ...data } : data),
        }),
      );
      queue = run.catch(() => {});
      return run;
    },
  };
}
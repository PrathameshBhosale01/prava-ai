// In-memory stand-in for the slice of the Admin SDK Firestore API that lib/zone uses.
// Deliberately strict where the real thing is: transactions buffer writes until
// commit and throw if you read after writing.

export function fakeFirestore() {
  const store = new Map(); // "blog_posts/p1/comments/c1" -> data
  let autoId = 0;
  let queue = Promise.resolve();

  const clone = (v) => structuredClone(v);
  const segs = (path) => path.split("/");

  const snapshot = (path) => ({
    id: segs(path).at(-1),
    ref: docRef(path),
    exists: store.has(path),
    data: () => (store.has(path) ? clone(store.get(path)) : undefined),
  });

  const applyWrite = (op) => {
    if (op.type === "set") store.set(op.path, op.merge ? { ...store.get(op.path), ...clone(op.data) } : clone(op.data));
    if (op.type === "update") {
      if (!store.has(op.path)) throw new Error(`update on missing doc ${op.path}`);
      store.set(op.path, { ...store.get(op.path), ...clone(op.data) });
    }
    if (op.type === "delete") store.delete(op.path);
  };

  const cmp = (a, b) => {
    const av = a instanceof Date ? a.getTime() : a;
    const bv = b instanceof Date ? b.getTime() : b;
    return av < bv ? -1 : av > bv ? 1 : 0;
  };

  function docRef(path) {
    return {
      id: segs(path).at(-1),
      path,
      get: async () => snapshot(path),
      set: async (data, opts) => applyWrite({ type: "set", path, data, merge: opts?.merge }),
      update: async (data) => applyWrite({ type: "update", path, data }),
      delete: async () => applyWrite({ type: "delete", path }),
      collection: (name) => collectionRef(`${path}/${name}`),
    };
  }

  function collectionRef(path, spec = { wheres: [], order: null, max: Infinity, after: null }) {
    const next = (patch) => collectionRef(path, { ...spec, ...patch });
    return {
      doc: (id) => docRef(`${path}/${id ?? `auto${++autoId}`}`),
      where: (field, op, value) => {
        if (op !== "==") throw new Error("fake supports == only");
        return next({ wheres: [...spec.wheres, { field, value }] });
      },
      orderBy: (field, dir = "asc") => next({ order: { field, dir } }),
      limit: (max) => next({ max }),
      startAfter: (snap) => next({ after: snap.id }),
      get: async () => {
        const depth = segs(path).length + 1;
        let paths = [...store.keys()].filter((p) => p.startsWith(`${path}/`) && segs(p).length === depth);
        paths = paths.filter((p) => spec.wheres.every((w) => store.get(p)[w.field] === w.value));
        if (spec.order) {
          const { field, dir } = spec.order;
          paths.sort((a, b) => (cmp(store.get(a)[field], store.get(b)[field]) || cmp(a, b)) * (dir === "desc" ? -1 : 1));
        }
        if (spec.after) {
          const i = paths.findIndex((p) => segs(p).at(-1) === spec.after);
          paths = i === -1 ? [] : paths.slice(i + 1);
        }
        const docs = paths.slice(0, spec.max).map(snapshot);
        return { docs, empty: docs.length === 0, size: docs.length };
      },
    };
  }

  return {
    store,
    collection: (name) => collectionRef(name),
    getAll: async (...refs) => refs.map((r) => snapshot(r.path)),
    batch: () => {
      const ops = [];
      return {
        delete: (ref) => ops.push({ type: "delete", path: ref.path }),
        set: (ref, data) => ops.push({ type: "set", path: ref.path, data }),
        commit: async () => ops.forEach(applyWrite),
      };
    },
    runTransaction: (fn) => {
      const run = queue.then(async () => {
        const writes = [];
        const tx = {
          get: async (ref) => {
            if (writes.length) throw new Error("Firestore transactions require all reads to be executed before all writes.");
            return snapshot(ref.path);
          },
          set: (ref, data, opts) => writes.push({ type: "set", path: ref.path, data, merge: opts?.merge }),
          update: (ref, data) => writes.push({ type: "update", path: ref.path, data }),
          delete: (ref) => writes.push({ type: "delete", path: ref.path }),
        };
        const result = await fn(tx);
        writes.forEach(applyWrite);
        return result;
      });
      queue = run.catch(() => {});
      return run;
    },
  };
}

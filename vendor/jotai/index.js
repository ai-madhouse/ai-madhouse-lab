"use client";

import { useCallback, useSyncExternalStore } from "react";

export function atom(initialValue) {
  return { key: Symbol("atom"), init: initialValue };
}

export function createStore() {
  const values = new Map();
  const listeners = new Map();

  function get(a) {
    if (values.has(a.key)) return values.get(a.key);
    return a.init;
  }

  function set(a, update) {
    const prev = get(a);
    const next = typeof update === "function" ? update(prev) : update;

    if (Object.is(prev, next)) return;

    values.set(a.key, next);
    listeners.get(a.key)?.forEach((listener) => {
      listener();
    });
  }

  function subscribe(a, listener) {
    const setListeners = listeners.get(a.key) ?? new Set();
    setListeners.add(listener);
    listeners.set(a.key, setListeners);

    return () => {
      const current = listeners.get(a.key);
      if (!current) return;
      current.delete(listener);
      if (current.size === 0) listeners.delete(a.key);
    };
  }

  return { get, set, subscribe };
}

const defaultStore = createStore();

export function getDefaultStore() {
  return defaultStore;
}

export function useAtomValue(a, opts) {
  const store = opts?.store ?? defaultStore;

  const subscribe = useCallback(
    (listener) => store.subscribe(a, listener),
    [store, a],
  );

  const getSnapshot = useCallback(() => store.get(a), [store, a]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useSetAtom(a, opts) {
  const store = opts?.store ?? defaultStore;
  return useCallback((update) => store.set(a, update), [store, a]);
}

export function useAtom(a, opts) {
  return [useAtomValue(a, opts), useSetAtom(a, opts)];
}

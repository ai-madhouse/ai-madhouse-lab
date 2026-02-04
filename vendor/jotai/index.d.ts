export type SetStateAction<Value> = Value | ((prev: Value) => Value);

export type PrimitiveAtom<Value> = {
  readonly key: symbol;
  readonly init: Value;
};

type Listener = () => void;

export type Store = {
  get: <Value>(atom: PrimitiveAtom<Value>) => Value;
  set: <Value>(
    atom: PrimitiveAtom<Value>,
    update: SetStateAction<Value>,
  ) => void;
  subscribe: <Value>(
    atom: PrimitiveAtom<Value>,
    listener: Listener,
  ) => () => void;
};

export declare function atom<Value>(initialValue: Value): PrimitiveAtom<Value>;
export declare function createStore(): Store;
export declare function getDefaultStore(): Store;
export declare function useAtomValue<Value>(
  a: PrimitiveAtom<Value>,
  opts?: { store?: Store },
): Value;
export declare function useSetAtom<Value>(
  a: PrimitiveAtom<Value>,
  opts?: { store?: Store },
): (update: SetStateAction<Value>) => void;
export declare function useAtom<Value>(
  a: PrimitiveAtom<Value>,
  opts?: { store?: Store },
): readonly [Value, (update: SetStateAction<Value>) => void];

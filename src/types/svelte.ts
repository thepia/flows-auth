// Svelte store types
export type Unsubscriber = () => void;
export type Subscriber<T> = (value: T) => void;
export type Readable<T> = {
  subscribe: (run: Subscriber<T>) => Unsubscriber;
};

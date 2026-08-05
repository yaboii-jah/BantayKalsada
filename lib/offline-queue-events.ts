type Listener = () => void;

const listeners = new Set<Listener>();

export function emitQueueChanged(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeQueueChanged(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

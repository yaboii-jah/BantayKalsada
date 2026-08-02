type Listener = (ids: Set<string>) => void;

let processingIds = new Set<string>();
const listeners = new Set<Listener>();

export function setProcessingIds(ids: Set<string>): void {
  processingIds = ids;
  for (const listener of listeners) {
    listener(processingIds);
  }
}

export function getProcessingIds(): Set<string> {
  return processingIds;
}

export function subscribeProcessing(listener: Listener): () => void {
  listeners.add(listener);
  listener(processingIds);
  return () => {
    listeners.delete(listener);
  };
}
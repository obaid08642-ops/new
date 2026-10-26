export interface UndoToast { id: number; text: string; undoLabel: string; onUndo: () => void }

let seq = 0;
const listeners = new Set<(toast: UndoToast | null) => void>();

/** "{name} was removed - Undo": shown at the bottom of the screen by CartMotionHost for five seconds. */
export function showUndoToast(text: string, undoLabel: string, onUndo: () => void): void {
  const toast: UndoToast = { id: ++seq, text, undoLabel, onUndo };
  listeners.forEach((listener) => listener(toast));
}

export function subscribeUndoToast(listener: (toast: UndoToast | null) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

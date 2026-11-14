/**
 * Owns the LiveKit room of one call screen from the moment it is created, not from the moment it has connected.
 * The screen can unmount while the room is still connecting (back button, a cancelled call): the cleanup must then disconnect that room,
 * and a connect that finishes after the unmount must not leave the microphone and camera live.
 */
export interface Disconnectable {
  disconnect(): Promise<void> | void;
}

export interface RoomHandle<R extends Disconnectable> {
  /** Register the room as soon as it exists, before connect(). */
  adopt(room: R): R;
  readonly disposed: boolean;
  /** Unmount: marks the handle disposed and disconnects the adopted room (also while it is still connecting). */
  dispose(): Promise<void>;
  /**
   * Run a step of the connection (connect, enabling tracks, ...). If the screen was disposed before or during the step the room is
   * disconnected and false is returned, so the caller stops without touching state.
   */
  step(run: () => Promise<unknown>): Promise<boolean>;
}

export function createRoomHandle<R extends Disconnectable>(): RoomHandle<R> {
  let room: R | null = null;
  let disposed = false;

  const stop = async () => {
    const r = room;
    room = null;
    if (!r) return;
    try {
      await r.disconnect();
    } catch {
      /* already gone */
    }
  };

  return {
    adopt(r) {
      room = r;
      if (disposed) void stop();
      return r;
    },
    get disposed() {
      return disposed;
    },
    async dispose() {
      disposed = true;
      await stop();
    },
    async step(run) {
      if (disposed) {
        await stop();
        return false;
      }
      try {
        await run();
      } catch (e) {
        if (disposed) {
          await stop();
          return false;
        }
        throw e;
      }
      if (disposed) {
        await stop();
        return false;
      }
      return true;
    },
  };
}

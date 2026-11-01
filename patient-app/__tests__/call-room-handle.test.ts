import { createRoomHandle } from '../src/calls/roomHandle';
import { chronological, type ChatMsg } from '../src/chat/chatState';

const fakeRoom = (connect: () => Promise<void> = async () => undefined) => {
  const room = { disconnect: jest.fn(async () => undefined), connect: jest.fn(connect) };
  return room;
};

describe('room handle: leaving the call screen while it connects', () => {
  it('disconnects the room when the screen unmounts mid-connect, and the late connect result is ignored', async () => {
    const handle = createRoomHandle<ReturnType<typeof fakeRoom>>();
    let finishConnect!: () => void;
    const room = handle.adopt(fakeRoom(() => new Promise<void>((resolve) => { finishConnect = resolve; })));
    const stepDone = handle.step(() => room.connect());
    await handle.dispose(); // unmount while connect() is pending
    expect(room.disconnect).toHaveBeenCalledTimes(1);
    finishConnect();
    expect(await stepDone).toBe(false);
  });

  it('a connect that finishes after the unmount leaves nothing live (disconnected, caller told to stop)', async () => {
    const handle = createRoomHandle<ReturnType<typeof fakeRoom>>();
    const room = handle.adopt(fakeRoom());
    const ran = handle.step(async () => { await handle.dispose(); });
    expect(await ran).toBe(false);
    expect(room.disconnect).toHaveBeenCalled();
  });

  it('a room adopted after the unmount is disconnected at once', async () => {
    const handle = createRoomHandle<ReturnType<typeof fakeRoom>>();
    await handle.dispose();
    const room = handle.adopt(fakeRoom());
    await Promise.resolve();
    expect(room.disconnect).toHaveBeenCalled();
    expect(await handle.step(async () => undefined)).toBe(false);
  });

  it('a normal call: steps run, the room stays up, unmount disconnects it once', async () => {
    const handle = createRoomHandle<ReturnType<typeof fakeRoom>>();
    const room = handle.adopt(fakeRoom());
    expect(await handle.step(() => room.connect())).toBe(true);
    expect(room.disconnect).not.toHaveBeenCalled();
    await handle.dispose();
    await handle.dispose();
    expect(room.disconnect).toHaveBeenCalledTimes(1);
  });

  it('a real connect failure still throws so the screen shows the error', async () => {
    const handle = createRoomHandle<ReturnType<typeof fakeRoom>>();
    const room = handle.adopt(fakeRoom(async () => { throw new Error('boom'); }));
    await expect(handle.step(() => room.connect())).rejects.toThrow('boom');
  });
});

describe('chat history order', () => {
  const m = (id: string, at: number): ChatMsg => ({ id, sender: 'doc', text: id, time: '', at });
  it('the server answers newest first; the thread reads oldest first', () => {
    expect(chronological([m('c', 3), m('b', 2), m('a', 1)]).map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
  it('does not mutate its input', () => {
    const input = [m('b', 2), m('a', 1)];
    chronological(input);
    expect(input.map((x) => x.id)).toEqual(['b', 'a']);
  });
});

describe('screens use them', () => {
  const read = (p: string) => (require('fs') as typeof import('fs')).readFileSync((require('path') as typeof import('path')).join(__dirname, '..', p), 'utf8');
  it('the call screen owns its room through the handle and disposes it on unmount', () => {
    const src = read('app/consultations/video-call.tsx');
    expect(src).toContain('createRoomHandle<Room>()');
    expect(src).toContain('handle.adopt(new Room(');
    expect(src).toMatch(/return \(\) => \{[^}]*void handle\.dispose\(\);/);
    expect(src).not.toContain('activeRoom');
  });
  it('the chat screen puts the loaded history in chronological order', () => {
    expect(read('app/consultations/chat-with-doctor.tsx')).toContain('chronological(list.map((m) => fromServer(m, myId, stamp)))');
  });
});

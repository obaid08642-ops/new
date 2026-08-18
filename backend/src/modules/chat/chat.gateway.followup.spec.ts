import { ForbiddenException } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';

describe('ChatGateway thread membership', () => {
  it('checks membership before joining a thread room', async () => {
    const getThread = jest.fn().mockRejectedValue(new ForbiddenException('not_participant'));
    const gateway = new ChatGateway({ getThread } as any);
    const socket: any = {
      id: 'socket-1',
      join: jest.fn(),
    };
    (gateway as any).activeUsers.set(socket.id, 'user-1');

    await expect(gateway.handleJoinThread(socket, { threadId: 'thread-foreign' })).resolves.toEqual({ error: 'not_participant' });
    expect(getThread).toHaveBeenCalledWith('thread-foreign', 'user-1');
    expect(socket.join).not.toHaveBeenCalled();
  });

  it('joins only after ChatService confirms membership', async () => {
    const getThread = jest.fn().mockResolvedValue({ id: 'thread-owned' });
    const gateway = new ChatGateway({ getThread } as any);
    const socket: any = {
      id: 'socket-2',
      join: jest.fn().mockResolvedValue(undefined),
    };
    (gateway as any).activeUsers.set(socket.id, 'user-2');

    await expect(gateway.handleJoinThread(socket, { threadId: 'thread-owned' })).resolves.toEqual({ status: 'joined' });
    expect(socket.join).toHaveBeenCalledWith('thread_thread-owned');
  });
});

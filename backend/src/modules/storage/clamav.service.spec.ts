import * as net from 'net';
import { ClamavService, parseReply } from './clamav.service';

/** A stand-in clamd: speaks INSTREAM and flags the EICAR test string, exactly like the real daemon's replies. */
const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

function fakeClamd(opts: { reply?: (data: Buffer) => string; hang?: boolean } = {}): Promise<{ port: number; close: () => Promise<void>; commands: string[]; sizes: number[] }> {
  const commands: string[] = [];
  const sizes: number[] = [];
  const server = net.createServer((socket) => {
    let buf = Buffer.alloc(0);
    let started = false;
    socket.on('data', (c) => {
      buf = Buffer.concat([buf, c]);
      if (!started) {
        const nul = buf.indexOf(0);
        if (nul < 0) return;
        commands.push(buf.subarray(0, nul).toString());
        buf = buf.subarray(nul + 1);
        started = true;
      }
      const payload: Buffer[] = [];
      let off = 0;
      while (buf.length - off >= 4) {
        const len = buf.readUInt32BE(off);
        if (len === 0) {
          if (opts.hang) return;
          const data = Buffer.concat(payload);
          sizes.push(data.length);
          const text = opts.reply ? opts.reply(data) : data.toString('latin1').includes(EICAR) ? 'stream: Eicar-Test-Signature FOUND' : 'stream: OK';
          socket.end(text + '\0');
          return;
        }
        if (buf.length - off - 4 < len) return;
        payload.push(buf.subarray(off + 4, off + 4 + len));
        off += 4 + len;
      }
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
    const { port } = server.address() as net.AddressInfo;
    resolve({ port, commands, sizes, close: () => new Promise((r) => { server.close(() => r()); (server as any).closeAllConnections?.(); }) });
  }));
}

describe('ClamavService (16.5)', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });

  it('parses clamd replies: only OK is clean, a FOUND names the signature, anything else is unavailable', () => {
    expect(parseReply('stream: OK\0')).toEqual({ status: 'clean' });
    expect(parseReply('stream: Eicar-Test-Signature FOUND\0')).toEqual({ status: 'infected', signature: 'Eicar-Test-Signature' });
    for (const bad of ['stream: INSTREAM size limit exceeded. ERROR', 'stream: lstat() failed ERROR', '', 'OK', 'stream: OK and more']) {
      expect(parseReply(bad)).toMatchObject({ status: 'unavailable' });
    }
  });

  it('is unavailable (never clean) when nothing is configured', async () => {
    delete process.env.CLAMD_HOST; delete process.env.CLAMD_SOCKET;
    const svc = new ClamavService();
    expect(svc.configured()).toBe(false);
    expect(await svc.scan(Buffer.from('x'))).toEqual({ status: 'unavailable', reason: 'clamd_not_configured' });
  });

  it('streams the file to clamd in INSTREAM chunks and returns clean', async () => {
    const clamd = await fakeClamd();
    process.env.CLAMD_HOST = '127.0.0.1'; process.env.CLAMD_PORT = String(clamd.port);
    const big = Buffer.alloc(200_000, 7); // more than one 64 KB chunk
    expect(await new ClamavService().scan(big)).toEqual({ status: 'clean' });
    expect(clamd.commands).toEqual(['zINSTREAM']);
    expect(clamd.sizes).toEqual([200_000]);
    await clamd.close();
  });

  it('flags the EICAR test file as infected, wherever it sits in the bytes', async () => {
    const clamd = await fakeClamd();
    process.env.CLAMD_HOST = '127.0.0.1'; process.env.CLAMD_PORT = String(clamd.port);
    const file = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(70_000, 1), Buffer.from(EICAR), Buffer.from('\n%%EOF')]);
    expect(await new ClamavService().scan(file)).toEqual({ status: 'infected', signature: 'Eicar-Test-Signature' });
    await clamd.close();
  });

  it('is unavailable when clamd is down, answers an error, or never answers', async () => {
    process.env.CLAMD_HOST = '127.0.0.1'; process.env.CLAMD_PORT = '1'; // nothing listens
    expect(await new ClamavService().scan(Buffer.from('x'))).toMatchObject({ status: 'unavailable', reason: 'clamd_unreachable' });
    const erroring = await fakeClamd({ reply: () => 'stream: INSTREAM size limit exceeded. ERROR' });
    process.env.CLAMD_PORT = String(erroring.port);
    expect(await new ClamavService().scan(Buffer.from('x'))).toMatchObject({ status: 'unavailable', reason: 'clamd_unexpected_reply' });
    await erroring.close();
  });
});

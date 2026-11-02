"""Local SMTP sink for live tests: accepts any AUTH, stores every message as a JSON line.
   python3 tools/live/smtp_sink.py [port=2525] [out=/tmp/nabd-mail.jsonl]
Point the backend at it: SES_SMTP_HOST=127.0.0.1 SES_SMTP_PORT=2525 SES_SMTP_USER=x SES_SMTP_PASS=x

Plain asyncio, no third-party package: aiosmtpd's Controller.start() raised "SMTP server started, but not responding within allotted time"
on the macOS runner of the native e2e iOS job (also with ready_timeout=60), so no mail was ever sent there. No TLS is offered, so a client
sends in clear text; AUTH PLAIN / LOGIN are accepted with any credentials."""
import asyncio, base64, email, json, sys, time
from email import policy

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 2525
OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp/nabd-mail.jsonl'


def store(rcpts, raw):
    msg = email.message_from_bytes(raw, policy=policy.default)
    parts = [p.get_content() for p in msg.walk() if p.get_content_type() in ('text/plain', 'text/html')]
    with open(OUT, 'a', encoding='utf8') as f:
        f.write(json.dumps({'at': time.time(), 'to': rcpts, 'subject': str(msg['subject']), 'body': '\n'.join(parts)}, ensure_ascii=False) + '\n')


async def session(reader, writer):
    async def say(line):
        writer.write((line + '\r\n').encode())
        await writer.drain()

    async def line():
        return (await reader.readline()).decode('utf8', 'replace').rstrip('\r\n')

    rcpts = []
    try:
        await say('220 nabd-sink ESMTP')
        while True:
            cmd = await line()
            if not cmd and reader.at_eof():
                break
            verb = cmd.split(' ', 1)[0].upper()
            if verb in ('EHLO', 'HELO'):
                await say('250-nabd-sink')
                await say('250-AUTH PLAIN LOGIN')
                await say('250 8BITMIME')
            elif verb == 'AUTH':
                mech = cmd.split()[1].upper() if len(cmd.split()) > 1 else ''
                if mech == 'LOGIN' and len(cmd.split()) < 3:
                    await say('334 VXNlcm5hbWU6'); await line()
                    await say('334 UGFzc3dvcmQ6'); await line()
                elif mech == 'PLAIN' and len(cmd.split()) < 3:
                    await say('334 '); await line()
                await say('235 2.7.0 Authentication successful')
            elif verb == 'MAIL':
                rcpts = []
                await say('250 OK')
            elif verb == 'RCPT':
                rcpts.append(cmd.split(':', 1)[1].strip().strip('<>').split('>')[0].strip('<'))
                await say('250 OK')
            elif verb == 'DATA':
                await say('354 End data with <CR><LF>.<CR><LF>')
                chunks = []
                while True:
                    l = await reader.readline()
                    if l in (b'.\r\n', b'.\n', b''):
                        break
                    chunks.append(l[1:] if l.startswith(b'..') else l)
                store(rcpts, b''.join(chunks))
                await say('250 OK')
            elif verb == 'RSET' or verb == 'NOOP':
                await say('250 OK')
            elif verb == 'QUIT':
                await say('221 Bye')
                break
            else:
                await say('502 Command not implemented')
    except (ConnectionError, asyncio.IncompleteReadError):
        pass
    finally:
        writer.close()


async def main():
    server = await asyncio.start_server(session, '127.0.0.1', PORT)
    print(f'smtp sink on {PORT} -> {OUT}', flush=True)
    async with server:
        await server.serve_forever()

asyncio.run(main())

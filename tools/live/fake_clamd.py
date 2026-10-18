"""ClamAV daemon stand-in for live journeys (CLAMD_HOST=127.0.0.1 CLAMD_PORT=3311).

Speaks clamd's INSTREAM protocol (zINSTREAM\\0, then <4-byte big-endian length><bytes> chunks, ended by a zero length) and
answers like the daemon: `stream: OK` or `stream: Eicar-Test-Signature FOUND`. It flags the EICAR test string only; the real
signature database is covered by the `clamav-integration` job (security.yml), which runs the same checks against clamav/clamav.
"""
import socketserver
import struct

EICAR = b'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'
PORT = 3311


class Handler(socketserver.StreamRequestHandler):
    def handle(self):
        command = b''
        while not command.endswith(b'\0'):
            c = self.rfile.read(1)
            if not c:
                return
            command += c
        if command != b'zINSTREAM\0':
            self.wfile.write(b'UNKNOWN COMMAND\0')
            return
        data = b''
        while True:
            head = self.rfile.read(4)
            if len(head) < 4:
                return
            (size,) = struct.unpack('>I', head)
            if size == 0:
                break
            data += self.rfile.read(size)
        self.wfile.write((b'stream: Eicar-Test-Signature FOUND' if EICAR in data else b'stream: OK') + b'\0')


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


if __name__ == '__main__':
    Server(('127.0.0.1', PORT), Handler).serve_forever()

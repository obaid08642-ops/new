"""OpenAI-compatible AI provider stand-in for live journeys (base_url http://127.0.0.1:9200/v1).
POST /v1/chat/completions answers the chat shape the gateway reads (choices[0].message.content). The reply is the JSON the
procurement prompt asks for: {"items":[{"name":...,"quantity":...}]}. Test seam only: it returns the same answer for any prompt.
Start:  python3 tools/live/fake_openai.py   (port 9200; the test database's provider record points at it, see j_qa_pr04_analyze.py)"""
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = 9200
ANSWER = {'items': [{'name': 'باراسيتامول 500 ملغ', 'quantity': 2}, {'name': 'Vitamin C 1000mg', 'quantity': 1}]}


class H(BaseHTTPRequestHandler):
    def _send(self, code, body):
        data = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('content-type', 'application/json')
        self.send_header('content-length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_POST(self):
        length = int(self.headers.get('content-length') or 0)
        self.rfile.read(length)
        if self.path.rstrip('/').endswith('/chat/completions'):
            return self._send(200, {'id': 'fake-1', 'object': 'chat.completion', 'model': 'fake-model',
                                    'choices': [{'index': 0, 'finish_reason': 'stop',
                                                 'message': {'role': 'assistant', 'content': json.dumps(ANSWER, ensure_ascii=False)}}]})
        self._send(404, {'error': {'message': 'not found'}})

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()

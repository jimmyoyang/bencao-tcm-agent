"""Local-only UI fixture. Nothing in tests/ is published to POPO."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / 'public'), **kwargs)

    def do_GET(self):
        if self.path == '/mobile':
            body=b'<!doctype html><title>Mobile layout fixture</title><iframe title="Mobile layout" src="/" style="width:390px;height:844px;border:0"></iframe>'
            self.send_response(200)
            self.send_header('Content-Type','text/html; charset=utf-8')
            self.end_headers()
            self.wfile.write(body)
        elif self.path == '/':
            html = (ROOT / 'public/index.html').read_text()
            fixture = (ROOT / 'tests/ui-fixture.js').read_text()
            html = html.replace('<script type="module"', '<script>' + fixture + '</script><script type="module"', 1)
            html = html.replace('<title>', '<title>LOCAL TEST · ')
            body = html.encode()
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            super().do_GET()

ThreadingHTTPServer(('127.0.0.1', int(sys.argv[1]) if len(sys.argv)>1 else 18766), Handler).serve_forever()

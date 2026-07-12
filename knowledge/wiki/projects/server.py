#!/usr/bin/env python3
"""
ISEKAI RPG Server - Python HTTP Server
Port: 8777
Serves all game HTML files
"""

import http.server
import socketserver
import os
from pathlib import Path

PORT = 8777
SCRIPT_DIR = Path(__file__).parent

MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
}

class GameHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Default to enhanced version
        if self.path == '/' or self.path == '/index.html':
            self.path = '/isekai-rpg-enhanced.html'
        
        try:
            file_path = SCRIPT_DIR / self.path.lstrip('/')
            if not file_path.exists():
                self.send_error(404, f"File not found: {self.path}")
                return
            
            ext = file_path.suffix.lower()
            content_type = MIME_TYPES.get(ext, 'application/octet-stream')
            
            with open(file_path, 'rb') as f:
                self.send_response(200)
                self.send_header('Content-type', content_type)
                self.send_header('Cache-Control', 'no-cache')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(f.read())
        except Exception as e:
            self.send_error(500, f"Server error: {str(e)}")

    def log_message(self, format, *args):
        print(f"[{self.client_address[0]}] {format % args}")

def run_server():
    print("""
╔════════════════════════════════════════════════════════╗
║       🎮 ISEKAI RPG SERVER - STARTED                   ║
║  🌐 Local:    http://localhost:8777                    ║
║  🚀 Default:  isekai-rpg-enhanced.html (fixed)         ║
║  🎮 Advanced: /isekai-rpg-advanced.html                ║
║  🕹️  Online:   /isekai-game-online.html                 ║
║  ⏹️  Stop:     Ctrl+C                                   ║
╚════════════════════════════════════════════════════════╝
    """)
    
    try:
        with socketserver.TCPServer(("", PORT), GameHandler) as httpd:
            print(f"✅ Server running on http://localhost:{PORT}")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n❌ Server stopped.")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    run_server()

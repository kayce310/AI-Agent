#!/usr/bin/env python3
"""
ISEKAI RPG Server - Python HTTP Server
Port: 8777
Serve game HTML + enable Cloudflare tunnel
"""

import http.server
import socketserver
import os
from pathlib import Path

PORT = 8777

# Get game file path
SCRIPT_DIR = Path(__file__).parent
GAME_FILE = SCRIPT_DIR / "isekai-rpg-advanced.html"

class GameHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/' or self.path == '/index.html':
            self.path = '/isekai-rpg-advanced.html'
        
        try:
            # Check if file exists
            file_path = SCRIPT_DIR / self.path.lstrip('/')
            if not file_path.exists():
                self.send_error(404, f"File not found: {self.path}")
                return
            
            # Serve file
            with open(file_path, 'rb') as f:
                self.send_response(200)
                self.send_header('Content-type', 'text/html; charset=utf-8')
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()
                self.wfile.write(f.read())
        except Exception as e:
            self.send_error(500, f"Server error: {str(e)}")

    def log_message(self, format, *args):
        """Custom logging"""
        print(f"[{self.client_address[0]}] {format % args}")

def run_server():
    print("""
╔════════════════════════════════════════════════════════╗
║       🎮 ISEKAI RPG SERVER - STARTED                   ║
║  🌐 Local:    http://localhost:8777                    ║
║  📦 File:     isekai-rpg-advanced.html                 ║
║  ⏹️  Stop:     Ctrl+C                                   ║
╚════════════════════════════════════════════════════════╝
    """)
    
    try:
        with socketserver.TCPServer(("", PORT), GameHandler) as httpd:
            print(f"✅ Server running on port {PORT}...")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n❌ Server stopped.")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    run_server()

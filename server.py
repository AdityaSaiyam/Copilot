import socket
import threading
import pyautogui
import keyboard  # for hotkey detection only
import json
import time
import pyperclip
import logging
import pywinctl
import re
import time
from http.server import BaseHTTPRequestHandler, HTTPServer
HOST = "127.0.0.1"
PORT = 5051


# ---------------------------
# LOGGING SETUP
# ---------------------------


# =======================================================
# COLOR LOGGING
# =======================================================
class ColorFormatter(logging.Formatter):
    COLORS = {
        "INFO": "\033[36m",      # Cyan
        "SUCCESS": "\033[32m",   # Green
        "WARNING": "\033[33m",   # Yellow
        "ERROR": "\033[31m",     # Red
        "DEBUG": "\033[35m",     # Magenta
        "RESET": "\033[0m"
    }

    def format(self, record):
        level = record.levelname
        color = self.COLORS.get(level, "")
        reset = self.COLORS["RESET"]
        record.msg = f"{color}{record.msg}{reset}"
        return super().format(record)

# Add SUCCESS level (custom)
logging.SUCCESS = 25
logging.addLevelName(logging.SUCCESS, "SUCCESS")
def success(self, message, *args, **kw):
    if self.isEnabledFor(logging.SUCCESS):
        self._log(logging.SUCCESS, message, args, **kw)
logging.Logger.success = success

handler = logging.StreamHandler()
handler.setFormatter(ColorFormatter("[%(levelname)s] %(asctime)s - %(message)s"))

logging.basicConfig(level=logging.INFO, handlers=[handler])
log = logging.getLogger()


pyautogui.FAILSAFE = False  # don't stop typing if mouse hits corner

current_conn = None
typing_enabled = True

last_window = None
window_accepts_text = True   # default yes (for first window)


class PingHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/ping":
            self.send_response(200)
            self.send_header("Content-type", "text/plain")
            self.end_headers()
            self.wfile.write(b"PONG")
        else:
            self.send_response(404)
            self.end_headers()


# ---------------------------
# TEXT-FRIENDLY WINDOW CHECK
# ---------------------------
def check_if_text_friendly():
    """
    If active window accepts keystrokes.
    """
    global window_accepts_text
    try:
        before = pyperclip.paste()
        keyboard.press_and_release("shift")
        time.sleep(0.05)
        after = pyperclip.paste()

        window_accepts_text = True
        return window_accepts_text

    except Exception as e:
        logging.error(f"Window check error: {e}")
        return True


# ---------------------------
# HOTKEY: Ctrl + Shift + Y
# ---------------------------
def setup_hotkey():
    keyboard.add_hotkey("ctrl+shift+y", on_hotkey)
    keyboard.add_hotkey("ctrl+y", on_hotkey)
    logging.info("🔥 Hotkey registered: CTRL + SHIFT + Y or CTRL + Y")


def on_hotkey():
    global current_conn

    if not current_conn:
        logging.warning("No active JS connection. Can't send clipboard.")
        return

    try:
        keyboard.press_and_release("ctrl+c")
        time.sleep(0.07)

        content = pyperclip.paste()

        payload = {
            "status": "active",
            "content": content
        }

        current_conn.send(json.dumps(payload).encode("utf-8"))

        logging.info(f"[HOTKEY] Clipboard sent ({len(content)} chars)")

    except Exception as e:
        logging.error(f"Error sending clipboard: {e}")

def run_post_formatter():
    """
    Simplest formatter:
    - Remove all markdown formatting markers (**  __  ~~  *)
    - Paste cleaned plain text
    """

    time.sleep(0.12)

    # SELECT ALL + COPY
    keyboard.press_and_release("ctrl+a")
    time.sleep(0.06)
    keyboard.press_and_release("ctrl+c")
    time.sleep(0.06)

    raw = pyperclip.paste() or ""

    # -------- CLEAN MARKDOWN SYNTAX --------
    cleaned = raw

    # Remove bold (**text**)
    cleaned = re.sub(r"\*\*(.*?)\*\*", r"\1", cleaned)

    # Remove underline (__text__)
    cleaned = re.sub(r"__(.*?)__", r"\1", cleaned)

    # Remove strike (~~text~~)
    cleaned = re.sub(r"~~(.*?)~~", r"\1", cleaned)

    # Remove italic (*text*) but not bold
    cleaned = re.sub(r"(?<!\*)\*(?!\*)(.*?)\*(?<!\*)", r"\1", cleaned)

    # Remove any leftover single markers
    cleaned = cleaned.replace("**", "")
    cleaned = cleaned.replace("__", "")
    cleaned = cleaned.replace("~~", "")
    cleaned = cleaned.replace("*", "")

    # -------- PASTE CLEANED TEXT BACK --------
    pyperclip.copy(cleaned)
    time.sleep(0.05)
    keyboard.press_and_release("ctrl+v")
    time.sleep(0.05)

    logging.info("✨ Plain-text cleanup complete! Markdown stripped.")

# ---------------------------
# SOCKET STREAM TYPING
# ---------------------------
def handle_client(conn):
    global current_conn, typing_enabled, last_window, window_accepts_text
    current_conn = conn

    logging.info("[CLIENT CONNECTED] Persistent session active.")

    while True:
        try:
            data = conn.recv(1024)
            if not data:
                continue

            text = data.decode("utf-8", errors="ignore")

            # FIRST: CHECK FORMAT COMMAND
            if text.strip() == "__FORMAT_NOW__":
                run_post_formatter()
                continue

            # THEN NORMAL TYPING
            if typing_enabled and text:
                active = pywinctl.getActiveWindow()

                if active:
                    window_title = active.title

                    if last_window != window_title:
                        last_window = window_title
                        window_accepts_text = check_if_text_friendly()
                        logging.info(f"[WINDOW] Active: {window_title}, Text-friendly: {window_accepts_text}")

                    if window_accepts_text:
                        keyboard.write(text,delay=1.5/100)  # 1.5ms per char
                    else:
                        logging.info(f"❌ Skipping typing (window not text-friendly): {window_title}")

                else:
                    logging.info("❌ No active window found")

        except Exception as e:
            logging.error(f"Socket error: {e}")
            break

    logging.info("[CLIENT DISCONNECTED]")


# ---------------------------
# SOCKET SERVER MAIN LOOP
# ---------------------------

def start_http_server():
    server_address = ("127.0.0.1", 5052)
    httpd = HTTPServer(server_address, PingHandler)
    logging.info("HTTP Ping server running on 127.0.0.1:5052")
    httpd.serve_forever()

def start_server():
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.bind((HOST, PORT))
    server.listen(1)

    logging.info(f"[SERVER READY] Listening on {HOST}:{PORT}")

    while True:
        conn, addr = server.accept()
        logging.info(f"[NEW CONNECTION] {addr}")
        threading.Thread(target=handle_client, args=(conn,), daemon=True).start()


if __name__ == "__main__":
    setup_hotkey()
    threading.Thread(target=start_http_server, daemon=True).start()
    start_server()

import { API_URL } from "@/enum";
import { STORAGE_KEY } from "@/keys";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BACKEND_WS_IP = API_URL.MAIN_URL;

type MessageCallback = (data: any) => void;

function toWsUrl(httpLike: string): string {
  // http://x → ws://x, https://x → wss://x ; ensure trailing /ws exactly once
  const base = httpLike.replace(/^http(s?):\/\//, (_m, s) =>
    s ? "wss://" : "ws://"
  );
  return base.endsWith("/ws") ? base : base.replace(/\/+$/, "") + "/ws";
}

class WebSocketService {
  ws: WebSocket | null = null;
  branchId: string | null = null;
  onMessage: MessageCallback | null = null;

  // Queue messages while socket isn’t OPEN
  private outbox: any[] = [];
  private isOpen = false;

  async connect(onMessage: MessageCallback) {
    this.branchId = await AsyncStorage.getItem(STORAGE_KEY.BRANCH_ID);
    if (!this.branchId) throw new Error("No branchId found in storage");

    const wsUrl = toWsUrl(BACKEND_WS_IP);
    console.log("[WebSocket] Connecting to:", wsUrl);

    const ws = new WebSocket(wsUrl);
    this.ws = ws;
    this.onMessage = onMessage;
    this.isOpen = false;

    ws.onopen = () => {
      this.isOpen = true;
      console.log("[WebSocket] Connected.");
      // Single canonical hello
      this.send({
        type: "controller",
        status: "connected",
        branchId: this.branchId,
      });
      // Flush anything queued before OPEN
      this.flushOutbox();
    };

    ws.onmessage = (event) => {
      const raw = event.data;
      try {
        const data = JSON.parse(raw);
        onMessage(data);
      } catch {
        // Pass through non-JSON frames (but DO NOT emit quoted JSON-strings as objects)
        console.warn("[WebSocket] Non-JSON data:", raw);
        onMessage(raw);
      }
    };

    ws.onclose = (e) => {
      console.warn("[WebSocket] Closed:", e.reason);
      this.isOpen = false;
      this.ws = null;
      // leave out auto-reconnect for now to keep behavior deterministic
    };

    ws.onerror = (err) => {
      console.error("[WebSocket] Error:", err);
    };
  }

  private flushOutbox() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    while (this.outbox.length) {
      const msg = this.outbox.shift();
      this._sendNow(msg);
    }
  }

  private _sendNow(data: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("[WebSocket] Not connected, can't send:", data);
      return;
    }
    // IMPORTANT: We only send JSON objects, never raw tokens like "ACTIVATE"
    if (typeof data === "string") {
      console.warn("[WebSocket] Blocked raw string send:", data);
      return;
    }
    try {
      this.ws.send(JSON.stringify(data));
      // console.debug("[WebSocket] OUT →", data);
    } catch (err) {
      console.error("[WebSocket] Failed to serialize data:", err);
    }
  }

  // Public sender: queues until OPEN; JSON-only
  send(data: any) {
    if (typeof data === "string") {
      // Prevent accidental raw tokens from being sent
      console.warn("[WebSocket] Ignoring raw string frame. Use JSON:", data);
      return;
    }
    if (this.isOpen && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this._sendNow(data);
    } else {
      this.outbox.push(data);
    }
  }

  close() {
    this.isOpen = false;
    this.outbox.length = 0;
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
  }
}

export default new WebSocketService();

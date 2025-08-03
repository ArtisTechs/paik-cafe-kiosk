import { API_URL } from "@/enum";
import { STORAGE_KEY } from "@/keys";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BACKEND_WS_IP = API_URL.MAIN_URL;

type MessageCallback = (data: any) => void;

class WebSocketService {
  ws: WebSocket | null = null;
  branchId: string | null = null;
  onMessage: MessageCallback | null = null;

  async connect(onMessage: MessageCallback) {
    this.branchId = await AsyncStorage.getItem(STORAGE_KEY.BRANCH_ID);
    if (!this.branchId) throw new Error("No branchId found in storage");

    // Convert http://192.168.1.123:8080 to ws://192.168.1.123:8080/ws
    let wsUrl = BACKEND_WS_IP.replace(/^http/, "ws") + "/ws";
    console.log("[WebSocket] Connecting to:", wsUrl);

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log("[WebSocket] Connected.");
      // Optionally: Send a handshake message or subscribe command if needed by backend/ESP32
      // this.ws.send(JSON.stringify({ branchId: this.branchId }));
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (e) {
        console.warn("WebSocket received non-JSON data:", event.data);
      }
    };

    this.ws.onclose = (e) => {
      console.warn("[WebSocket] Closed:", e.reason);
      this.ws = null;
      // You can optionally auto-reconnect here if needed
    };

    this.ws.onerror = (err) => {
      console.error("[WebSocket] Error:", err);
    };

    this.onMessage = onMessage;
  }

  send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn("[WebSocket] Not connected, can't send:", data);
    }
  }

  close() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export default new WebSocketService();

// src/services/position-service.ts
import { API_URL } from "@/enum";
import { STORAGE_KEY } from "@/keys";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

export interface RobotPosition {
  key?: string;
  currentPosition?: string;
}

const CURRENT_POSITION_URL = `${API_URL.BASE_URL}${API_URL.ROBOT_POSITIONS}${API_URL.CURRENT}`;

export const getCurrentPosition = async (): Promise<RobotPosition> => {
  try {
    const res = await axios.get(CURRENT_POSITION_URL, {
      responseType: "text",
      transformResponse: [(data) => data],
      headers: { Accept: "text/plain" },
    });

    const text = String(res.data || "").trim();
    return { key: text, currentPosition: text };
  } catch (error: any) {
    throw error.response;
  }
};

export function extractTableNumberFromPosition(
  pos?: RobotPosition | null
): string {
  const key = pos?.key?.toLowerCase().trim();
  if (!key || key === "starting" || key === "start") return "";
  const m = key.match(/table\s*([0-9]+)/i) || key.match(/table([0-9]+)/i);
  return m?.[1] ?? "";
}

export const updateCurrentPosition = async (
  position: string
): Promise<boolean> => {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEY.TOKEN);

    const res = await axios.put(CURRENT_POSITION_URL, null, {
      params: { position },
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });

    return res.status >= 200 && res.status < 300;
  } catch (error: any) {
    throw error.response;
  }
};

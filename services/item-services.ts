import axios from "axios";
import { API_URL } from "../enum";

const itemsURL = `${API_URL.BASE_URL}${API_URL.ITEMS}`;

export const fetchItemList = async () => {
  try {
    const response = await axios.get(itemsURL, {});
    return response.data;
  } catch (error: any) {
    throw error.response;
  }
};

export const deleteItem = async (itemTypeId: string) => {
  try {
    const response = await axios.delete(`${itemsURL}/${itemTypeId}`, {});
    return response.data;
  } catch (error: any) {
    throw error.response;
  }
};

export const addItem = async (payload: any) => {
  try {
    const response = await axios.post(itemsURL, payload, {});
    return response.data;
  } catch (error: any) {
    throw error.response;
  }
};

export const editItem = async (id: string, payload: any) => {
  try {
    const response = await axios.put(`${itemsURL}/${id}`, payload, {});
    return response.data;
  } catch (error: any) {
    throw error.response;
  }
};

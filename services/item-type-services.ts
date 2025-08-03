import axios from "axios";
import { API_URL } from "../enum";

const itemTypesURL = `${API_URL.BASE_URL}${API_URL.ITEM_TYPES}`;

export const fetchItemTypes = async () => {
  try {
    const response = await axios.get(itemTypesURL, {});
    return response.data;
  } catch (error: any) {
    throw error.response;
  }
};

export const deleteItemType = async (itemTypeId: string) => {
  try {
    const response = await axios.delete(`${itemTypesURL}/${itemTypeId}`, {});
    return response.data;
  } catch (error: any) {
    throw error.response;
  }
};

export const addItemType = async (payload: any) => {
  try {
    const response = await axios.post(itemTypesURL, payload, {});
    return response.data;
  } catch (error: any) {
    throw error.response;
  }
};

export const editItemType = async (id: string, payload: any) => {
  try {
    const response = await axios.put(`${itemTypesURL}/${id}`, payload, {});
    return response.data;
  } catch (error: any) {
    throw error.response;
  }
};

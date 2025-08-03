import axios from "axios";
import { API_URL } from "../enum";

const ordersURL = `${API_URL.BASE_URL}${API_URL.ORDERS}`;

export const fetchOrderList = async ({
  startDate = null,
  endDate = null,
  sortBy = "orderTime",
  sortDirection = "ASC",
}) => {
  try {
    const response = await axios.get(ordersURL, {
      params: {
        startDate,
        endDate,
        sortBy,
        sortDirection,
      },
    });

    return response.data;
  } catch (error: any) {
    throw error.response;
  }
};

export const updateOrderStatus = async (orderId: string, status = "DONE") => {
  try {
    const response = await axios.patch(
      `${ordersURL}/${orderId}/status`,
      { orderStatus: status },
      {
        params: { status },
      }
    );
    return response.data;
  } catch (error: any) {
    throw error.response;
  }
};

export const deleteOrder = async (orderId: string) => {
  try {
    const response = await axios.delete(`${ordersURL}/${orderId}`, {});
    return response.data;
  } catch (error: any) {
    throw error.response;
  }
};

export const updateOrder = async (orderId: string, payload: any) => {
  try {
    const response = await axios.put(`${ordersURL}/${orderId}`, payload, {});
    return response.data;
  } catch (error: any) {
    throw error.response;
  }
};

export const createOrder = async (payload: any) => {
  try {
    const response = await axios.post(ordersURL, payload);
    return response.data;
  } catch (error: any) {
    throw error.response;
  }
};

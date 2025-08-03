import axios from "axios";
import { API_URL } from "../enum";
import { getTokenAsync } from "./global-services";

const usersURL = `${API_URL.BASE_URL}${API_URL.USERS}`;

export const userSignIn = async (userDetails: any) => {
  try {
    const response = await axios.post(
      `${usersURL}${API_URL.LOGIN}`,
      userDetails
    );
    return response.data;
  } catch (error: any) {
    throw error.response.data;
  }
};

export const getUserDetails = async (userId: string) => {
  try {
    const storedToken = await getTokenAsync();
    const response = await axios.get(`${usersURL}/${userId}`, {
      headers: {
        ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
      },
    });
    return response.data;
  } catch (error: any) {
    throw error.response;
  }
};

export const deleteUser = async (userId: string) => {
  try {
    const storedToken = await getTokenAsync();
    const response = await axios.delete(
      `${usersURL}${API_URL.DELETE}/${userId}`,
      {
        headers: {
          ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
        },
      }
    );
    return response.data; // Return the response from the server (success message)
  } catch (error: any) {
    throw error.response.data; // Handle error
  }
};

// Load Cloudinary credentials from the environment variables
const CLOUDINARY_URL =
  "https://api.cloudinary.com/v1_1/" +
  process.env.REACT_APP_CLOUDINARY_CLOUD_NAME +
  "/image/upload";
const CLOUDINARY_UPLOAD_PRESET: any = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

// Function for uploading a profile picture to Cloudinary
export const uploadProfilePicture = async (profilePicture: any) => {
  try {
    const formData = new FormData();

    // Append the profile picture file
    if (profilePicture && profilePicture instanceof File) {
      formData.append("file", profilePicture);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    }

    // Make a POST request to Cloudinary
    const response = await axios.post(CLOUDINARY_URL, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    // Get the URL of the uploaded image from the response
    const imageUrl = response.data.secure_url;

    // Return the image URL (you can use it to update the user's profile)
    return imageUrl;
  } catch (error: any) {
    console.error("Error uploading profile picture:", error);
    throw error.response;
  }
};

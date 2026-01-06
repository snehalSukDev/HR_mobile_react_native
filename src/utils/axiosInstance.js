// src/services/axiosInstance.js
import axios from "axios";

const axiosInstance = axios.create({
  baseURL: "https://glsdemo.techbirdit.in/",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded",
    Accept: "application/json",
  },
  withCredentials: true,
  // You can also add auth headers here if needed
  // headers: { Authorization: `Bearer ${token}` }
});

export default axiosInstance;

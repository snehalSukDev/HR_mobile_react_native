import * as Location from "expo-location";
import axiosInstance from "./axiosInstance";
import qs from "qs";
// src/utils/frappeApi.js
// Utility functions for interacting with the Frappe API in React Native.
// These use standard fetch, which works in React Native.

const FRAPPE_BASE_URL = "https://glsdemo.techbirdit.in"; // !!! IMPORTANT: REPLACE THIS WITH YOUR ACTUAL FRAPPE SITE URL !!!

// Helper function for making authenticated Frappe API requests
async function frappeFetch(path, options = {}) {
  const url = `${FRAPPE_BASE_URL}${path}`;
  console.log(`[FrappeAPI] Fetching: ${url}`); // Debugging log

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...options.headers,
      },
      // IMPORTANT: For Frappe login/session, use 'omit' or 'same-origin' if this RN app is not hosted on the same origin as Frappe,
      // and handle authentication with tokens (e.g., OAuth).
      // If you are relying on direct cookie session from Frappe login, 'include' is needed.
      // However, Expo Go often runs on a different domain/port, so cookies might not be shared automatically.
      credentials: "include", // This tells the browser to send/receive cookies
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: response.statusText }));
      console.error(
        `[FrappeAPI] API Error (${response.status} ${response.statusText}):`,
        errorData
      );
      throw new Error(
        errorData.message || `API request failed with status ${response.status}`
      );
    }

    const data = await response.json();
    console.log(`[FrappeAPI] Response for ${path}:`, data); // Debugging log
    return data;
  } catch (error) {
    console.error(`[FrappeAPI] Network/Fetch Error for ${path}:`, error);
    throw error;
  }
}

// Function for actual user login with Frappe
export async function loginUser(email, password) {
  try {
    const response = await fetch(`${FRAPPE_BASE_URL}/api/method/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ usr: email, pwd: password }),
      credentials: "include", // Crucial for receiving session cookies
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: response.statusText }));
      console.error("[FrappeAPI] Login Error:", errorData);
      throw new Error(
        errorData.message || `Login failed with status ${response.status}`
      );
    }

    const data = await response.json();
    if (data.message === "Logged In") {
      console.log("[FrappeAPI] Login successful for user:", email);
      return { success: true, message: data.message };
    } else {
      throw new Error(
        data.message || "Login failed: Unexpected response from server."
      );
    }
  } catch (error) {
    console.error("[FrappeAPI] Network/Login Fetch Error:", error);
    throw new Error(`Login failed: ${error.message || "Network error"}`);
  }
}

// Get currently logged-in user's email
export async function getCurrentUser() {
  try {
    const data = await frappeFetch("/api/method/frappe.auth.get_logged_user");
    return { email: data.message }; // Frappe's get_logged_user returns email in message
  } catch (error) {
    console.warn("[FrappeAPI] No user logged in or error getting user:", error);
    // If the error is 403 (Forbidden) and specifically mentions not whitelisted, it means the API call itself is blocked.
    // If it's 401 (Unauthorized) or similar, it often means no valid session.
    throw error; // Re-throw to be caught by calling component
  }
}

// Fetch employee details by user ID (email) or employee name
export async function fetchEmployeeDetails(identifier, byEmail = true) {
  let filters;
  let fields = [
    "name",
    "employee_name",
    "user_id",
    "designation",
    "department",
    "cell_number",
    "date_of_joining",
    "gender",
    "blood_group",
    "image",
  ];

  if (byEmail) {
    filters = [["user_id", "=", identifier]];
  } else {
    filters = [["name", "=", identifier]];
  }

  try {
    const data = await frappeFetch(
      `/api/resource/Employee?filters=${JSON.stringify(
        filters
      )}&fields=${JSON.stringify(fields)}`
    );
    if (data && data.data && data.data.length > 0) {
      return data.data[0];
    }
    return null;
  } catch (error) {
    console.error("Error fetching employee details:", error);
    throw error;
  }
}

// Get a list of resources (DocTypes) with filters and fields
export async function getResourceList(doctype, params = {}) {
  const queryParams = new URLSearchParams();
  if (params.filters) queryParams.append("filters", params.filters);
  if (params.fields) queryParams.append("fields", params.fields);
  if (params.order_by) queryParams.append("order_by", params.order_by);
  if (params.limit_page_length)
    queryParams.append("limit_page_length", params.limit_page_length);

  try {
    const data = await frappeFetch(
      `/api/resource/${encodeURIComponent(doctype)}?${queryParams.toString()}`
    );
    return data.data;
  } catch (error) {
    console.error(`Error getting resource list for ${doctype}:`, error);
    throw error;
  }
}

// Get a single resource (DocType) by name
export async function getResource(doctype, name) {
  try {
    const data = await frappeFetch(
      `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`
    );
    return data.data;
  } catch (error) {
    console.error(`Error getting resource ${name} from ${doctype}:`, error);
    throw error;
  }
}

// Call a Frappe Python method
export async function callFrappeMethod(method, args = {}) {
  try {
    const res = await axiosInstance.post(
      `api/method/${method}`,
      qs.stringify(args),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    console.log("Frappe method call response:", res);

    return res.data?.message ?? res.data;
  } catch (error) {
    const status = error?.response?.status;
    const data = error?.response?.data;
    const message =
      (typeof data?.message === "string" && data.message) ||
      (typeof data?._server_messages === "string" && data._server_messages) ||
      error?.message ||
      `Request failed${status ? ` with status ${status}` : ""}`;
    throw new Error(message);
  }
}

// Function for actual user logout with Frappe
export async function logoutUser() {
  try {
    // Frappe's logout method is usually a GET request
    const response = await fetch(`${FRAPPE_BASE_URL}/api/method/logout`, {
      method: "GET",
      credentials: "include", // Ensure cookies are sent to clear session
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: response.statusText }));
      console.error("[FrappeAPI] Logout Error:", errorData);
      throw new Error(
        errorData.message || `Logout failed with status ${response.status}`
      );
    }

    console.log("Logout successful from Frappe.");
    return { success: true, message: "Logout successful" };
  } catch (error) {
    console.error("[FrappeAPI] Network/Logout Fetch Error:", error);
    throw new Error(`Logout failed: ${error.message || "Network error"}`);
  }
}

export async function getGeolocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Location permission not granted");
  }
  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
}

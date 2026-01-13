import * as Location from "expo-location";
import axiosInstance from "./axiosInstance";
import { setAxiosBaseURL } from "./axiosInstance";
import qs from "qs";
// src/utils/frappeApi.js
// Utility functions for interacting with the Frappe API in React Native.
// These use standard fetch, which works in React Native.

let frappeBaseUrl = "https://glsdemo.techbirdit.in";

function normalizeFrappeBaseUrl(input) {
  const raw = String(input || "").trim();
  if (!raw) throw new Error("Frappe URL is required");

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error("Invalid Frappe URL");
  }

  const origin = url.origin;
  if (!/^https?:\/\//i.test(origin)) throw new Error("Invalid Frappe URL");
  return origin.replace(/\/+$/, "");
}

export function setFrappeBaseUrl(nextBaseUrl) {
  const normalized = normalizeFrappeBaseUrl(nextBaseUrl);
  frappeBaseUrl = normalized;
  setAxiosBaseURL(`${normalized}/`);
  return frappeBaseUrl;
}

export function getFrappeBaseUrl() {
  return frappeBaseUrl;
}

// Helper function for making authenticated Frappe API requests
async function frappeFetch(path, options = {}) {
  const url = `${frappeBaseUrl}${path}`;
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
  console.log(`[FrappeAPI] Login attempt for user: ${(email, password)}`);
  try {
    const response = await fetch(`${frappeBaseUrl}/api/method/login`, {
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

export function parseFrappeServerMessages(raw) {
  try {
    if (!raw) return "";
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!Array.isArray(arr)) return "";
    const parts = arr
      .map((item) => {
        try {
          const obj = typeof item === "string" ? JSON.parse(item) : item || {};
          const text = obj.message || obj.title || "";
          // remove HTML tags/backticks
          return String(text)
            .replace(/<[^>]*>/g, "")
            .replace(/`/g, "")
            .trim();
        } catch {
          return String(item)
            .replace(/<[^>]*>/g, "")
            .replace(/`/g, "")
            .trim();
        }
      })
      .filter(Boolean);
    return parts.join("\n");
  } catch {
    return "";
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
    "employment_type",
    "person_to_be_contacted",
    "emergency_phone_number",
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
  const normalizeJsonParam = (value) => {
    if (value == null) return null;
    return typeof value === "string" ? value : JSON.stringify(value);
  };

  const filters = normalizeJsonParam(params.filters);
  const fields = normalizeJsonParam(params.fields);
  const orderBy = params.order_by ?? params.orderBy;
  const limitPageLength =
    params.limit_page_length ?? params.limitPageLength ?? params.limit;
  const asDict = params.as_dict ?? params.asDict;

  if (filters) queryParams.append("filters", filters);
  if (fields) queryParams.append("fields", fields);
  if (orderBy) {
    const orderByString =
      typeof orderBy === "string"
        ? orderBy
        : `${orderBy.field} ${(orderBy.order || "asc").toLowerCase()}`;
    queryParams.append("order_by", orderByString);
  }
  if (limitPageLength != null)
    queryParams.append("limit_page_length", String(limitPageLength));
  if (asDict) queryParams.append("as_dict", "1");

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
    const err = new Error(message);
    err.serverMessagesText = parseFrappeServerMessages(data?._server_messages);
    err.raw = data;
    throw err;
  }
}

// Function for actual user logout with Frappe
export async function logoutUser() {
  try {
    // Frappe's logout method is usually a GET request
    const response = await fetch(`${frappeBaseUrl}/api/method/logout`, {
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

export async function getMetaData(doctype) {
  try {
    const res = await axiosInstance.get(
      `/api/method/frappe.desk.form.load.getdoctype`,
      { params: { doctype } }
    );
    const docs = res?.data?.message?.docs || res?.data?.docs || [];
    const fields = Array.isArray(docs) && docs[0]?.fields ? docs[0].fields : [];
    return { docs, fields };
  } catch (e) {
    throw e;
  }
}

export async function fnSearchLink(
  txt = "",
  linkDoctype = "",
  ignore_user_permissions = 0,
  reference_doctype = "",
  filter = { query: "", filters: {} }
) {
  try {
    const payload = {
      txt,
      doctype: linkDoctype,
      ignore_user_permissions,
      reference_doctype,
      page_length: 10,
      query: filter?.query || "",
      filters: JSON.stringify(filter?.filters) || {},
    };
    const response = await axiosInstance.post(
      `/api/v2/method/frappe.desk.search.search_link`,
      qs.stringify(payload),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
      }
    );
    const d = response?.data;
    if (Array.isArray(d?.data)) return d.data;
    if (Array.isArray(d?.message?.results)) return d.message.results;
    if (Array.isArray(d?.results)) return d.results;
    if (Array.isArray(d)) return d;
    return [];
  } catch {
    return [];
  }
}

export async function saveDoc(doc) {
  try {
    const res = await axiosInstance.post(
      "/api/method/frappe.desk.form.save.savedocs",
      qs.stringify({
        doc: JSON.stringify(doc),
        action: "Save",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    return res.data;
  } catch (error) {
    const data = error?.response?.data;
    console.error("Save Doc Error:", data || error);
    const err = new Error(
      (typeof data?.message === "string" && data.message) ||
        "Failed to save document"
    );
    err.serverMessagesText = parseFrappeServerMessages(data?._server_messages);
    err.raw = data;
    throw err;
  }
}

export async function submitSavedDoc(saved, fallbackDoc) {
  const base =
    (saved && typeof saved === "object" && saved) ||
    (fallbackDoc && typeof fallbackDoc === "object" && fallbackDoc) ||
    {};
  const payload =
    (Array.isArray(base.docs) && base.docs[0]
      ? base.docs[0]
      : base.doc ||
        (base.message &&
          ((Array.isArray(base.message.docs) && base.message.docs[0]) ||
            base.message.doc)) ||
        base) || {};
  const minimal = {
    doctype: payload.doctype || fallbackDoc?.doctype || "",
    name: payload.name || "",
  };
  if (!minimal.doctype || !minimal.name) {
    throw new Error("Cannot submit document: missing doctype or name");
  }

  try {
    const res = await axiosInstance.post(
      "/api/method/frappe.desk.form.save.savedocs",
      qs.stringify({
        doc: JSON.stringify(minimal),
        action: "Submit",
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    return res.data?.message;
  } catch (error) {
    const data = error?.response?.data;
    console.error("Submit Doc Error:", data || error);
    const err = new Error(
      (typeof data?.message === "string" && data.message) ||
        "Failed to submit document"
    );
    err.serverMessagesText = parseFrappeServerMessages(data?._server_messages);
    err.raw = data;
    throw err;
  }
}

setAxiosBaseURL(`${frappeBaseUrl}/`);

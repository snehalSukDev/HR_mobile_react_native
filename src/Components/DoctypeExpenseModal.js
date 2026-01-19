import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
  ToastAndroid,
  KeyboardAvoidingView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  getMetaData,
  fnSearchLink,
  getResource,
  saveDoc,
  submitSavedDoc,
} from "../utils/frappeApi";
import { Formik } from "formik";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { Alert } from "react-native";

const safeDate = (val) => {
  const d = val ? new Date(val) : new Date();
  return isNaN(d.getTime()) ? new Date() : d;
};

const MIN_SEARCH_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 600;
const MAX_LINK_RESULTS = 25;

const DoctypeExpenseModal = ({
  visible,
  onClose,
  doctype,
  title,
  onSuccess,
}) => {
  const [fields, setFields] = useState([]);
  const [childTables, setChildTables] = useState([]);
  const [linkResults, setLinkResults] = useState({});
  const [dropdownOpen, setDropdownOpen] = useState({});
  const [datePickerField, setDatePickerField] = useState(null);
  const [invalidFields, setInvalidFields] = useState({});
  const scrollRef = useRef(null);
  const positionsRef = useRef({});
  const linkSearchTimeoutsRef = useRef({});
  const isMountedRef = useRef(true);
  const metaCacheRef = useRef({});

  useEffect(() => {
    isMountedRef.current = true;
    const timeouts = linkSearchTimeoutsRef.current;
    return () => {
      isMountedRef.current = false;
      Object.values(timeouts).forEach((id) => {
        if (id) clearTimeout(id);
      });
    };
  }, []);

  useEffect(() => {
    async function loadMeta() {
      if (!visible) return;
      try {
        const cached = metaCacheRef.current[doctype];
        if (cached && Array.isArray(cached.fields)) {
          if (!isMountedRef.current) return;
          setFields(cached.fields);
          setChildTables(
            Array.isArray(cached.childTables) ? cached.childTables : []
          );
          return;
        }

        const res = await getMetaData(doctype);
        if (!isMountedRef.current) return;
        console.log("meta", res);
        const rawFields = res && Array.isArray(res.fields) ? res.fields : [];
        const filtered = rawFields.filter(
          (f) =>
            f &&
            [
              "Data",
              "Date",
              "Int",
              "Float",
              "Currency",
              "Select",
              "Link",
              "Check",
              "Small Text",
              "Text",
            ].includes(f.fieldtype) &&
            !f.hidden &&
            !["amended_from", "naming_series"].includes(f.fieldname)
        );

        const tables = [];
        const tableDefs = rawFields.filter(
          (f) =>
            f &&
            f.fieldtype === "Table" &&
            !f.hidden &&
            !["amended_from", "naming_series"].includes(f.fieldname)
        );
        for (const t of tableDefs) {
          const opt =
            t && typeof t.options === "string" ? t.options.trim() : "";
          if (!opt) continue;
          try {
            const childMeta = await getMetaData(opt);
            if (!isMountedRef.current) return;
            const childFields = (childMeta.fields || []).filter(
              (cf) =>
                cf &&
                [
                  "Data",
                  "Date",
                  "Int",
                  "Float",
                  "Currency",
                  "Select",
                  "Link",
                  "Check",
                  "Small Text",
                  "Text",
                  "Table",
                ].includes(cf.fieldtype) &&
                !cf.hidden
            );
            tables.push({
              fieldname: t.fieldname,
              label: t.label || t.fieldname,
              options: opt,
              fields: childFields,
            });
          } catch {}
        }

        if (!isMountedRef.current) return;
        metaCacheRef.current[doctype] = {
          fields: filtered,
          childTables: tables,
        };
        setFields(filtered);
        setChildTables(tables);
      } catch (err) {
        console.error("loadMeta error", err);
        Alert.alert("Error", "Failed to load form definition");
        onClose();
      }
    }
    loadMeta();
  }, [visible, doctype]);

  const initialValues = {};
  fields.forEach((f) => {
    if (f.fieldtype === "Date" && f.fieldname === "posting_date") {
      initialValues[f.fieldname] = format(new Date(), "yyyy-MM-dd");
    } else {
      initialValues[f.fieldname] = "";
    }
  });
  childTables.forEach((tbl) => {
    if (!initialValues[tbl.fieldname]) {
      initialValues[tbl.fieldname] = [];
    }
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title || doctype}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={22} color="#333" />
            </TouchableOpacity>
          </View>
          <Formik
            initialValues={initialValues}
            enableReinitialize
            onSubmit={async (values, { setSubmitting }) => {
              const missing = [];
              fields.forEach((f) => {
                if (f.reqd) {
                  const v = values[f.fieldname];
                  let empty = false;
                  if (f.fieldtype === "Check") {
                    empty = v !== true;
                  } else if (v == null) {
                    empty = true;
                  } else if (typeof v === "string") {
                    empty = v.trim().length === 0;
                  }
                  if (empty) missing.push(f.fieldname);
                }
              });
              if (missing.length > 0) {
                const nextInvalid = {};
                missing.forEach((k) => (nextInvalid[k] = true));
                setInvalidFields(nextInvalid);
                const first = missing[0];
                const y = positionsRef.current[first] ?? 0;
                if (scrollRef.current && typeof y === "number") {
                  scrollRef.current.scrollTo({
                    y: Math.max(y - 12, 0),
                    animated: true,
                  });
                }
                setSubmitting(false);
                return;
              } else {
                setInvalidFields({});
              }
              const tempName = `new-${doctype
                .toLowerCase()
                .replace(/ /g, "-")}-${Date.now()}`;
              console.log("onSubmit", values);
              try {
                const docValues = { ...values };
                childTables.forEach((tbl) => {
                  const rows = Array.isArray(values[tbl.fieldname])
                    ? values[tbl.fieldname]
                    : [];
                  if (rows.length === 0) return;
                  docValues[tbl.fieldname] = rows.map((row, idx) => ({
                    ...row,
                    doctype: tbl.options,
                    parent: tempName,
                    parentfield: tbl.fieldname,
                    parenttype: doctype,
                    idx: idx + 1,
                    __islocal: 1,
                    __unsaved: 1,
                  }));
                });
                const doc = {
                  ...docValues,

                  // Required Frappe meta
                  doctype,
                  name: tempName,
                  docstatus: 0,
                  __islocal: 1,
                  __unsaved: 1,

                  // Optional but recommended
                  // owner: "hrmanager@test.com",
                  posting_date: format(new Date(), "yyyy-MM-dd"),
                  // status: "Open",
                };

                const saved = await saveDoc(doc);

                if (doctype === "Attendance Request") {
                  await submitSavedDoc(saved, doc);
                }

                Alert.alert(
                  "Success",
                  doctype === "Attendance Request"
                    ? `${doctype} submitted successfully`
                    : `${doctype} saved successfully`
                );
                if (typeof onSuccess === "function") {
                  onSuccess({ saved, tempDoc: doc, doctype });
                }
                onClose();
              } catch (err) {
                const serverText =
                  (err && err.serverMessagesText) || err.message || String(err);
                if (Platform.OS === "android") {
                  ToastAndroid.show(serverText, ToastAndroid.LONG);
                } else {
                  Alert.alert("Error", serverText);
                }
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ values, setFieldValue, handleSubmit }) => (
              <>
                <ScrollView
                  style={styles.modalBody}
                  ref={scrollRef}
                  keyboardShouldPersistTaps="handled"
                >
                  {fields.length === 0 ? (
                    <View style={styles.noDataContainer}>
                      <MaterialIcons
                        name="info-outline"
                        size={24}
                        color="#666"
                      />
                      <Text style={styles.noDataText}>
                        No fields available.
                      </Text>
                    </View>
                  ) : (
                    fields.map((f) => {
                      const value = values[f.fieldname] ?? "";
                      const options =
                        typeof f.options === "string"
                          ? f.options.split("\n").filter(Boolean)
                          : [];
                      if (f.fieldtype === "Check") {
                        return (
                          <View
                            key={f.fieldname}
                            style={styles.formField}
                            onLayout={(e) => {
                              positionsRef.current[f.fieldname] =
                                e.nativeEvent.layout.y;
                            }}
                          >
                            <Text style={styles.formLabel}>
                              {f.label} {f.reqd ? "*" : ""}
                            </Text>
                            <TouchableOpacity
                              style={styles.checkField}
                              onPress={() => {
                                try {
                                  setFieldValue(f.fieldname, !value);
                                  setInvalidFields((prev) => ({
                                    ...prev,
                                    [f.fieldname]: false,
                                  }));
                                } catch (e) {
                                  console.error(e);
                                }
                              }}
                            >
                              <MaterialIcons
                                name={
                                  value
                                    ? "check-box"
                                    : "check-box-outline-blank"
                                }
                                size={20}
                                color="#007bff"
                              />
                              <Text style={styles.checkLabel}>{f.label}</Text>
                            </TouchableOpacity>
                          </View>
                        );
                      }
                      if (f.fieldtype === "Select" && options.length > 0) {
                        return (
                          <View
                            key={f.fieldname}
                            style={styles.formField}
                            onLayout={(e) => {
                              positionsRef.current[f.fieldname] =
                                e.nativeEvent.layout.y;
                            }}
                          >
                            <Text style={styles.formLabel}>
                              {f.label} {f.reqd ? "*" : ""}
                            </Text>
                            <View
                              style={[
                                styles.selectField,
                                invalidFields[f.fieldname] &&
                                  styles.inputFieldError,
                              ]}
                            >
                              {options.map((opt) => (
                                <TouchableOpacity
                                  key={opt}
                                  style={[
                                    styles.optionPill,
                                    value === opt && styles.optionPillActive,
                                  ]}
                                  onPress={() => {
                                    try {
                                      setFieldValue(f.fieldname, opt);
                                      setInvalidFields((prev) => ({
                                        ...prev,
                                        [f.fieldname]: false,
                                      }));
                                    } catch (e) {
                                      console.error(e);
                                    }
                                  }}
                                >
                                  <Text
                                    style={[
                                      styles.optionText,
                                      value === opt && styles.optionTextActive,
                                    ]}
                                  >
                                    {opt}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                        );
                      }
                      if (
                        f.fieldtype === "Link" &&
                        typeof f.options === "string" &&
                        f.options
                      ) {
                        return (
                          <View
                            key={f.fieldname}
                            style={styles.formField}
                            onLayout={(e) => {
                              positionsRef.current[f.fieldname] =
                                e.nativeEvent.layout.y;
                            }}
                          >
                            <Text style={styles.formLabel}>
                              {f.label} {f.reqd ? "*" : ""}
                            </Text>
                            <TextInput
                              style={[
                                styles.inputField,
                                invalidFields[f.fieldname] &&
                                  styles.inputFieldError,
                              ]}
                              value={String(value)}
                              onFocus={() => {
                                setDropdownOpen((prev) => {
                                  const next = {};
                                  Object.keys(prev).forEach(
                                    (k) => (next[k] = false)
                                  );
                                  return { ...next, [f.fieldname]: true };
                                });
                                (async () => {
                                  try {
                                    if (!isMountedRef.current) return;
                                    const res = await fnSearchLink(
                                      String(value || ""),
                                      f.options,
                                      0,
                                      doctype,
                                      { query: "", filters: {} }
                                    );
                                    if (isMountedRef.current) {
                                      const arr = Array.isArray(res) ? res : [];
                                      setLinkResults((prev) => ({
                                        ...prev,
                                        [f.fieldname]: arr.slice(
                                          0,
                                          MAX_LINK_RESULTS
                                        ),
                                      }));
                                    }
                                  } catch (e) {
                                    console.error(e);
                                  }
                                })();
                              }}
                              onChangeText={async (t) => {
                                try {
                                  setFieldValue(f.fieldname, t);
                                  setInvalidFields((prev) => ({
                                    ...prev,
                                    [f.fieldname]: false,
                                  }));
                                  const key = f.fieldname;
                                  if (linkSearchTimeoutsRef.current[key]) {
                                    clearTimeout(
                                      linkSearchTimeoutsRef.current[key]
                                    );
                                  }
                                  const trimmed = t.trim();
                                  if (
                                    !trimmed ||
                                    trimmed.length < MIN_SEARCH_LENGTH
                                  ) {
                                    setLinkResults((prev) => ({
                                      ...prev,
                                      [key]: [],
                                    }));
                                    setDropdownOpen((prev) => ({
                                      ...prev,
                                      [key]: false,
                                    }));
                                    return;
                                  }
                                  linkSearchTimeoutsRef.current[key] =
                                    setTimeout(async () => {
                                      try {
                                        if (!isMountedRef.current) return;
                                        const res = await fnSearchLink(
                                          trimmed,
                                          f.options,
                                          0,
                                          doctype,
                                          { query: "", filters: {} }
                                        );
                                        if (isMountedRef.current) {
                                          const arr = Array.isArray(res)
                                            ? res
                                            : [];
                                          setLinkResults((prev) => ({
                                            ...prev,
                                            [key]: arr.slice(
                                              0,
                                              MAX_LINK_RESULTS
                                            ),
                                          }));
                                          setDropdownOpen((prev) => ({
                                            ...prev,
                                            [key]: true,
                                          }));
                                        }
                                      } catch (e) {
                                        console.error(e);
                                      }
                                    }, SEARCH_DEBOUNCE_MS);
                                } catch (e) {
                                  console.error(e);
                                }
                              }}
                              placeholder={f.placeholder || f.label}
                            />
                            {dropdownOpen[f.fieldname] &&
                              (linkResults[f.fieldname] || []).length > 0 && (
                                <View style={styles.dropdownList}>
                                  {(linkResults[f.fieldname] || []).map(
                                    (item) => {
                                      const rawVal =
                                        (item && typeof item === "object"
                                          ? item.value ||
                                            item.name ||
                                            item.id ||
                                            item.label
                                          : item) ?? "";
                                      const val =
                                        typeof rawVal === "string"
                                          ? rawVal
                                          : String(rawVal);
                                      const label =
                                        (item &&
                                          typeof item === "object" &&
                                          typeof item.description ===
                                            "string" &&
                                          item.description.trim()) ||
                                        (item &&
                                          typeof item === "object" &&
                                          typeof item.label === "string" &&
                                          item.label) ||
                                        val;
                                      return (
                                        <TouchableOpacity
                                          key={`${f.fieldname}-${val}`}
                                          style={[
                                            styles.dropdownItem,
                                            value === val &&
                                              styles.dropdownItemActive,
                                          ]}
                                          onPress={() => {
                                            try {
                                              setFieldValue(f.fieldname, val);
                                              setInvalidFields((prev) => ({
                                                ...prev,
                                                [f.fieldname]: false,
                                              }));
                                              if (f.fieldname === "employee") {
                                                (async () => {
                                                  try {
                                                    if (!isMountedRef.current)
                                                      return;
                                                    const emp =
                                                      await getResource(
                                                        "Employee",
                                                        val
                                                      );
                                                    if (isMountedRef.current) {
                                                      const empName =
                                                        emp?.employee_name ||
                                                        "";
                                                      if (empName) {
                                                        setFieldValue(
                                                          "employee_name",
                                                          empName
                                                        );
                                                      }
                                                    }
                                                  } catch {}
                                                })();
                                              }
                                              setDropdownOpen((prev) => ({
                                                ...prev,
                                                [f.fieldname]: false,
                                              }));
                                            } catch (e) {
                                              console.error(e);
                                            }
                                          }}
                                        >
                                          <Text
                                            style={[
                                              styles.dropdownItemText,
                                              value === val &&
                                                styles.optionTextActive,
                                            ]}
                                          >
                                            {label}
                                          </Text>
                                        </TouchableOpacity>
                                      );
                                    }
                                  )}
                                </View>
                              )}
                          </View>
                        );
                      }
                      if (f.fieldtype === "Date") {
                        return (
                          <View
                            key={f.fieldname}
                            style={styles.formField}
                            onLayout={(e) => {
                              positionsRef.current[f.fieldname] =
                                e.nativeEvent.layout.y;
                            }}
                          >
                            <Text style={styles.formLabel}>
                              {f.label} {f.reqd ? "*" : ""}
                            </Text>
                            <TouchableOpacity
                              style={[
                                styles.inputField,
                                invalidFields[f.fieldname] &&
                                  styles.inputFieldError,
                              ]}
                              onPress={() => {
                                setDropdownOpen({});
                                setDatePickerField(f.fieldname);
                              }}
                            >
                              <Text>
                                {value ? String(value) : "Select date"}
                              </Text>
                            </TouchableOpacity>
                            {datePickerField === f.fieldname && (
                              <DateTimePicker
                                mode="date"
                                value={safeDate(value)}
                                onChange={(event, selectedDate) => {
                                  if (selectedDate) {
                                    const formatted = format(
                                      selectedDate,
                                      "yyyy-MM-dd"
                                    );
                                    setFieldValue(f.fieldname, formatted);
                                    setInvalidFields((prev) => ({
                                      ...prev,
                                      [f.fieldname]: false,
                                    }));
                                  }
                                  setDatePickerField(null);
                                }}
                              />
                            )}
                          </View>
                        );
                      }
                      return (
                        <View
                          key={f.fieldname}
                          style={styles.formField}
                          onLayout={(e) => {
                            positionsRef.current[f.fieldname] =
                              e.nativeEvent.layout.y;
                          }}
                        >
                          <Text style={styles.formLabel}>
                            {f.label} {f.reqd ? "*" : ""}
                          </Text>
                          <TextInput
                            style={[
                              styles.inputField,
                              invalidFields[f.fieldname] &&
                                styles.inputFieldError,
                            ]}
                            value={String(value)}
                            onFocus={() =>
                              setDropdownOpen((prev) => {
                                const next = {};
                                Object.keys(prev).forEach(
                                  (k) => (next[k] = false)
                                );
                                return next;
                              })
                            }
                            onChangeText={(t) => {
                              try {
                                setFieldValue(f.fieldname, t);
                                setInvalidFields((prev) => ({
                                  ...prev,
                                  [f.fieldname]: false,
                                }));
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            placeholder={f.placeholder || f.label}
                            keyboardType={
                              f.fieldtype === "Int" || f.fieldtype === "Float"
                                ? "numeric"
                                : "default"
                            }
                          />
                        </View>
                      );
                    })
                  )}
                  {childTables.length > 0 && (
                    <View>
                      {childTables.map((tbl) => {
                        const rows = Array.isArray(values[tbl.fieldname])
                          ? values[tbl.fieldname]
                          : [];
                        return (
                          <View
                            key={tbl.fieldname}
                            style={styles.childTableSection}
                          >
                            <View style={styles.childRowHeader}>
                              <Text style={styles.childTableTitle}>
                                {tbl.label} ({tbl.options})
                              </Text>
                              <TouchableOpacity
                                style={styles.childAddRowButton}
                                onPress={() => {
                                  try {
                                    const existing = Array.isArray(
                                      values[tbl.fieldname]
                                    )
                                      ? values[tbl.fieldname]
                                      : [];
                                    const newRow = {};
                                    tbl.fields.forEach((cf) => {
                                      newRow[cf.fieldname] = "";
                                    });
                                    setFieldValue(tbl.fieldname, [
                                      ...existing,
                                      newRow,
                                    ]);
                                  } catch (e) {
                                    console.error(e);
                                  }
                                }}
                              >
                                <Text style={styles.childAddRowText}>
                                  Add Row
                                </Text>
                              </TouchableOpacity>
                            </View>
                            {rows.length === 0 ? (
                              <Text style={styles.noDataText}>
                                No rows. Tap Add Row.
                              </Text>
                            ) : (
                              rows.map((row, rowIndex) => (
                                <View
                                  key={`${tbl.fieldname}-row-${rowIndex}`}
                                  style={styles.childRowContainer}
                                >
                                  <Text style={styles.childRowTitle}>
                                    Row {rowIndex + 1}
                                  </Text>
                                  {tbl.fields.map((cf) => {
                                    const childValue = row[cf.fieldname] ?? "";
                                    const fieldPath = `${tbl.fieldname}[${rowIndex}].${cf.fieldname}`;
                                    const options =
                                      typeof cf.options === "string"
                                        ? cf.options.split("\n").filter(Boolean)
                                        : [];
                                    if (cf.fieldtype === "Check") {
                                      return (
                                        <View
                                          key={`${tbl.fieldname}-${cf.fieldname}-${rowIndex}`}
                                          style={styles.formField}
                                        >
                                          <Text style={styles.formLabel}>
                                            {cf.label || cf.fieldname}{" "}
                                            {cf.reqd ? "*" : ""}
                                          </Text>
                                          <TouchableOpacity
                                            style={styles.checkField}
                                            onPress={() => {
                                              try {
                                                setFieldValue(
                                                  fieldPath,
                                                  !childValue
                                                );
                                              } catch (e) {
                                                console.error(e);
                                              }
                                            }}
                                          >
                                            <MaterialIcons
                                              name={
                                                childValue
                                                  ? "check-box"
                                                  : "check-box-outline-blank"
                                              }
                                              size={20}
                                              color="#007bff"
                                            />
                                            <Text style={styles.checkLabel}>
                                              {cf.label || cf.fieldname}
                                            </Text>
                                          </TouchableOpacity>
                                        </View>
                                      );
                                    }
                                    if (
                                      cf.fieldtype === "Select" &&
                                      options.length > 0
                                    ) {
                                      return (
                                        <View
                                          key={`${tbl.fieldname}-${cf.fieldname}-${rowIndex}`}
                                          style={styles.formField}
                                        >
                                          <Text style={styles.formLabel}>
                                            {cf.label || cf.fieldname}{" "}
                                            {cf.reqd ? "*" : ""}
                                          </Text>
                                          <View style={styles.selectField}>
                                            {options.map((opt) => (
                                              <TouchableOpacity
                                                key={opt}
                                                style={[
                                                  styles.optionPill,
                                                  childValue === opt &&
                                                    styles.optionPillActive,
                                                ]}
                                                onPress={() => {
                                                  try {
                                                    setFieldValue(
                                                      fieldPath,
                                                      opt
                                                    );
                                                  } catch (e) {
                                                    console.error(e);
                                                  }
                                                }}
                                              >
                                                <Text
                                                  style={[
                                                    styles.optionText,
                                                    childValue === opt &&
                                                      styles.optionTextActive,
                                                  ]}
                                                >
                                                  {opt}
                                                </Text>
                                              </TouchableOpacity>
                                            ))}
                                          </View>
                                        </View>
                                      );
                                    }
                                    if (
                                      cf.fieldtype === "Link" &&
                                      typeof cf.options === "string" &&
                                      cf.options
                                    ) {
                                      return (
                                        <View
                                          key={`${tbl.fieldname}-${cf.fieldname}-${rowIndex}`}
                                          style={styles.formField}
                                        >
                                          <Text style={styles.formLabel}>
                                            {cf.label || cf.fieldname}{" "}
                                            {cf.reqd ? "*" : ""}
                                          </Text>
                                          <TextInput
                                            style={styles.inputField}
                                            value={String(childValue)}
                                            onFocus={() => {
                                              try {
                                                setDropdownOpen((prev) => {
                                                  const next = {};
                                                  Object.keys(prev).forEach(
                                                    (k) => (next[k] = false)
                                                  );
                                                  return {
                                                    ...next,
                                                    [fieldPath]: true,
                                                  };
                                                });
                                                (async () => {
                                                  try {
                                                    if (!isMountedRef.current)
                                                      return;
                                                    const res =
                                                      await fnSearchLink(
                                                        String(
                                                          childValue || ""
                                                        ),
                                                        cf.options,
                                                        0,
                                                        doctype,
                                                        {
                                                          query: "",
                                                          filters: {},
                                                        }
                                                      );
                                                    if (isMountedRef.current) {
                                                      const arr = Array.isArray(
                                                        res
                                                      )
                                                        ? res
                                                        : [];
                                                      setLinkResults(
                                                        (prev) => ({
                                                          ...prev,
                                                          [fieldPath]:
                                                            arr.slice(
                                                              0,
                                                              MAX_LINK_RESULTS
                                                            ),
                                                        })
                                                      );
                                                    }
                                                  } catch (e) {
                                                    console.error(e);
                                                  }
                                                })();
                                              } catch (e) {
                                                console.error(e);
                                              }
                                            }}
                                            onChangeText={async (t) => {
                                              try {
                                                setFieldValue(fieldPath, t);
                                                const key = fieldPath;
                                                if (
                                                  linkSearchTimeoutsRef.current[
                                                    key
                                                  ]
                                                ) {
                                                  clearTimeout(
                                                    linkSearchTimeoutsRef
                                                      .current[key]
                                                  );
                                                }
                                                const trimmed = t.trim();
                                                if (
                                                  !trimmed ||
                                                  trimmed.length <
                                                    MIN_SEARCH_LENGTH
                                                ) {
                                                  setLinkResults((prev) => ({
                                                    ...prev,
                                                    [key]: [],
                                                  }));
                                                  setDropdownOpen((prev) => ({
                                                    ...prev,
                                                    [key]: false,
                                                  }));
                                                  return;
                                                }
                                                linkSearchTimeoutsRef.current[
                                                  key
                                                ] = setTimeout(async () => {
                                                  try {
                                                    if (!isMountedRef.current)
                                                      return;
                                                    const res =
                                                      await fnSearchLink(
                                                        trimmed,
                                                        cf.options,
                                                        0,
                                                        doctype,
                                                        {
                                                          query: "",
                                                          filters: {},
                                                        }
                                                      );
                                                    if (isMountedRef.current) {
                                                      const arr = Array.isArray(
                                                        res
                                                      )
                                                        ? res
                                                        : [];
                                                      setLinkResults(
                                                        (prev) => ({
                                                          ...prev,
                                                          [key]: arr.slice(
                                                            0,
                                                            MAX_LINK_RESULTS
                                                          ),
                                                        })
                                                      );
                                                      setDropdownOpen(
                                                        (prev) => ({
                                                          ...prev,
                                                          [key]: true,
                                                        })
                                                      );
                                                    }
                                                  } catch (e) {
                                                    console.error(e);
                                                  }
                                                }, SEARCH_DEBOUNCE_MS);
                                              } catch (e) {
                                                console.error(e);
                                              }
                                            }}
                                            placeholder={
                                              cf.placeholder ||
                                              cf.label ||
                                              cf.fieldname
                                            }
                                          />
                                          {dropdownOpen[fieldPath] &&
                                            (linkResults[fieldPath] || [])
                                              .length > 0 && (
                                              <View style={styles.dropdownList}>
                                                {(
                                                  linkResults[fieldPath] || []
                                                ).map((item) => {
                                                  const rawVal =
                                                    (item &&
                                                    typeof item === "object"
                                                      ? item.value ||
                                                        item.name ||
                                                        item.id ||
                                                        item.label
                                                      : item) ?? "";
                                                  const val =
                                                    typeof rawVal === "string"
                                                      ? rawVal
                                                      : String(rawVal);
                                                  const label =
                                                    (item &&
                                                      typeof item ===
                                                        "object" &&
                                                      typeof item.description ===
                                                        "string" &&
                                                      item.description.trim()) ||
                                                    (item &&
                                                      typeof item ===
                                                        "object" &&
                                                      typeof item.label ===
                                                        "string" &&
                                                      item.label) ||
                                                    val;
                                                  return (
                                                    <TouchableOpacity
                                                      key={`${fieldPath}-${val}`}
                                                      style={[
                                                        styles.dropdownItem,
                                                        childValue === val &&
                                                          styles.dropdownItemActive,
                                                      ]}
                                                      onPress={() => {
                                                        try {
                                                          setFieldValue(
                                                            fieldPath,
                                                            val
                                                          );
                                                          setDropdownOpen(
                                                            (prev) => ({
                                                              ...prev,
                                                              [fieldPath]: false,
                                                            })
                                                          );
                                                        } catch (e) {
                                                          console.error(e);
                                                        }
                                                      }}
                                                    >
                                                      <Text
                                                        style={[
                                                          styles.dropdownItemText,
                                                          childValue === val &&
                                                            styles.optionTextActive,
                                                        ]}
                                                      >
                                                        {label}
                                                      </Text>
                                                    </TouchableOpacity>
                                                  );
                                                })}
                                              </View>
                                            )}
                                        </View>
                                      );
                                    }
                                    if (cf.fieldtype === "Date") {
                                      const dateKey = fieldPath;
                                      return (
                                        <View
                                          key={`${tbl.fieldname}-${cf.fieldname}-${rowIndex}`}
                                          style={styles.formField}
                                        >
                                          <Text style={styles.formLabel}>
                                            {cf.label || cf.fieldname}{" "}
                                            {cf.reqd ? "*" : ""}
                                          </Text>
                                          <TouchableOpacity
                                            style={styles.inputField}
                                            onPress={() => {
                                              try {
                                                setDropdownOpen({});
                                                setDatePickerField(dateKey);
                                              } catch (e) {
                                                console.error(e);
                                              }
                                            }}
                                          >
                                            <Text>
                                              {childValue
                                                ? String(childValue)
                                                : "Select date"}
                                            </Text>
                                          </TouchableOpacity>
                                          {datePickerField === dateKey && (
                                            <DateTimePicker
                                              mode="date"
                                              value={safeDate(childValue)}
                                              onChange={(
                                                event,
                                                selectedDate
                                              ) => {
                                                try {
                                                  if (selectedDate) {
                                                    const formatted = format(
                                                      selectedDate,
                                                      "yyyy-MM-dd"
                                                    );
                                                    setFieldValue(
                                                      fieldPath,
                                                      formatted
                                                    );
                                                  }
                                                  setDatePickerField(null);
                                                } catch (e) {
                                                  console.error(e);
                                                }
                                              }}
                                            />
                                          )}
                                        </View>
                                      );
                                    }
                                    return (
                                      <View
                                        key={`${tbl.fieldname}-${cf.fieldname}-${rowIndex}`}
                                        style={styles.formField}
                                      >
                                        <Text style={styles.formLabel}>
                                          {cf.label || cf.fieldname}{" "}
                                          {cf.reqd ? "*" : ""}
                                        </Text>
                                        <TextInput
                                          style={styles.inputField}
                                          value={
                                            childValue == null
                                              ? ""
                                              : String(childValue)
                                          }
                                          onFocus={() => {
                                            try {
                                              setDropdownOpen((prev) => {
                                                const next = {};
                                                Object.keys(prev).forEach(
                                                  (k) => (next[k] = false)
                                                );
                                                return next;
                                              });
                                            } catch (e) {
                                              console.error(e);
                                            }
                                          }}
                                          onChangeText={(t) => {
                                            try {
                                              setFieldValue(fieldPath, t);
                                            } catch (e) {
                                              console.error(e);
                                            }
                                          }}
                                          placeholder={
                                            cf.placeholder ||
                                            cf.label ||
                                            cf.fieldname
                                          }
                                          keyboardType={
                                            cf.fieldtype === "Int" ||
                                            cf.fieldtype === "Float"
                                              ? "numeric"
                                              : "default"
                                          }
                                        />
                                      </View>
                                    );
                                  })}
                                </View>
                              ))
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </ScrollView>
                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[
                      styles.footerButton,
                      { backgroundColor: "#6c757d" },
                    ]}
                    onPress={onClose}
                  >
                    <Text style={styles.footerButtonText}>Close</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.footerButton,
                      { backgroundColor: "#007bff" },
                    ]}
                    onPress={handleSubmit}
                  >
                    <Text style={styles.footerButtonText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Formik>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e9ecef",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#343a40",
  },
  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  formField: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 13,
    color: "#6c757d",
    marginBottom: 6,
  },
  inputField: {
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#343a40",
    backgroundColor: "#fff",
  },
  inputFieldError: {
    borderColor: "#dc3545",
    borderWidth: 1,
  },
  selectField: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  optionPill: {
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  optionPillActive: {
    borderColor: "#007bff",
    backgroundColor: "#e7f1ff",
  },
  optionText: {
    fontSize: 13,
    color: "#343a40",
  },
  optionTextActive: {
    color: "#007bff",
    fontWeight: "600",
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: "#dee2e6",
    borderRadius: 10,
    marginTop: 6,
    backgroundColor: "#fff",
    maxHeight: 180,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e9ecef",
  },
  dropdownItemActive: {
    backgroundColor: "#e7f1ff",
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#343a40",
  },
  checkField: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkLabel: {
    marginLeft: 8,
    color: "#343a40",
    fontSize: 14,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e9ecef",
  },
  footerButton: {
    flex: 1,
    marginHorizontal: 6,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  footerButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  childTableSection: {
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e9ecef",
  },
  childTableTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#343a40",
    marginBottom: 8,
  },
  childFieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  childFieldLabel: {
    fontSize: 13,
    color: "#343a40",
  },
  childFieldType: {
    fontSize: 12,
    color: "#6c757d",
  },
  childRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  childAddRowButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#007bff",
  },
  childAddRowText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  childRowContainer: {
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e9ecef",
  },
  childRowTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#343a40",
    marginBottom: 4,
  },
});

export default DoctypeExpenseModal;

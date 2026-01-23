import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import {
  getMetaData,
  getResource,
  saveDoc,
  submitSavedDoc,
  getCurrentUser,
  fetchEmployeeDetails,
} from "../utils/frappeApi";
import { Formik, useFormikContext } from "formik";
import { format } from "date-fns";
import Toast from "react-native-toast-message";

import GenericField from "./FormComponents/GenericField";
import LinkField from "./FormComponents/LinkField";
import { useTheme } from "../context/ThemeContext";
import CustomLoader from "./CustomLoader";

const DoctypeFormFields = React.memo(
  ({
    fields,
    invalidFields,
    setInvalidFields,
    positionsRef,
    scrollRef,
    isMountedRef,
    doctype,
    onClose,
  }) => {
    const { colors, theme } = useTheme();
    const { values, setFieldValue, handleSubmit, isSubmitting } =
      useFormikContext();

    const dynamicStyles = useMemo(
      () => ({
        noDataText: { color: colors.textSecondary },
        modalBody: { backgroundColor: colors.background },
        modalFooter: {
          borderTopColor: colors.border,
          backgroundColor: colors.card,
        },
      }),
      [colors, theme],
    );

    const handleFieldChange = React.useCallback(
      (fieldname, val) => {
        setFieldValue(fieldname, val);
        if (invalidFields[fieldname]) {
          setInvalidFields((prev) => ({
            ...prev,
            [fieldname]: false,
          }));
        }

        if (
          fieldname === "employee" &&
          typeof val === "string" &&
          val.trim().length >= 3
        ) {
          (async () => {
            try {
              if (!isMountedRef.current) return;
              const emp = await getResource("Employee", val);
              if (isMountedRef.current && emp?.employee_name) {
                setFieldValue("employee_name", emp.employee_name);
              }
            } catch {}
          })();
        }
      },
      [setFieldValue, invalidFields, isMountedRef, setInvalidFields],
    );

    return (
      <>
        <ScrollView
          style={[styles.modalBody, dynamicStyles.modalBody]}
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
        >
          {fields.length === 0 ? (
            <View style={styles.noDataContainer}>
              <MaterialIcons
                name="info-outline"
                size={24}
                color={colors.textSecondary}
              />
              <Text style={[styles.noDataText, dynamicStyles.noDataText]}>
                No fields available.
              </Text>
            </View>
          ) : (
            fields.map((f) => {
              const value = values[f.fieldname];

              return (
                <View
                  key={f.fieldname}
                  onLayout={(e) => {
                    positionsRef.current[f.fieldname] = e.nativeEvent.layout.y;
                  }}
                >
                  {f.fieldtype === "Link" ? (
                    <LinkField
                      field={f}
                      value={value}
                      onFieldChange={handleFieldChange}
                      doctype={doctype}
                      error={invalidFields[f.fieldname]}
                    />
                  ) : (
                    <GenericField
                      field={f}
                      value={value}
                      onFieldChange={handleFieldChange}
                      error={invalidFields[f.fieldname]}
                    />
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
        <View style={[styles.modalFooter, dynamicStyles.modalFooter]}>
          <TouchableOpacity
            style={[styles.footerButton, { backgroundColor: "#6c757d" }]}
            onPress={onClose}
          >
            <Text style={styles.footerButtonText}>Close</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerButton, { backgroundColor: colors.primary }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.footerButtonText}>
              {isSubmitting ? "Saving..." : "Submit"}
            </Text>
          </TouchableOpacity>
        </View>
      </>
    );
  },
);

const DoctypeFormModal = ({
  visible,
  onClose,
  doctype,
  title,
  onSuccess,
  hiddenFields = [],
}) => {
  const { colors, theme } = useTheme();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [invalidFields, setInvalidFields] = useState({});
  const [employeeDetails, setEmployeeDetails] = useState(null);

  const scrollRef = useRef(null);
  const positionsRef = useRef({});
  const isMountedRef = useRef(true);
  const metaCacheRef = useRef({});

  const dynamicStyles = useMemo(
    () => ({
      modalContainer: { backgroundColor: colors.background },
      modalHeader: {
        borderBottomColor: colors.border,
        backgroundColor: colors.card,
      },
      modalTitle: { color: colors.text },
      loader: { color: colors.primary },
      closeIcon: { color: colors.text },
    }),
    [colors, theme],
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    async function loadMeta() {
      if (!visible) return;
      setLoading(true);

      try {
        if (!employeeDetails) {
          try {
            const { email } = await getCurrentUser();
            if (email) {
              const emp = await fetchEmployeeDetails(email, true);
              if (isMountedRef.current) setEmployeeDetails(emp);
            }
          } catch (e) {
            console.warn("Failed to load employee details for prefill", e);
          }
        }

        if (metaCacheRef.current[doctype]) {
          if (isMountedRef.current) {
            // Apply hiddenFields filter even if cached
            const cachedFields = metaCacheRef.current[doctype];
            const filteredCached = cachedFields.filter(
              (f) => !hiddenFields.includes(f.fieldname),
            );
            setFields(filteredCached);
          }
          setLoading(false);
          return;
        }

        const res = await getMetaData(doctype);
        if (!isMountedRef.current) return;

        const filtered = (res.fields || []).filter(
          (f) =>
            ([
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
              "Text Editor",
              "Long Text",
              "HTML Editor",
              "Code",
              "Markdown Editor",
              "Rich Text",
            ].includes(f.fieldtype) ||
              ["description", "content", "message_content"].includes(
                f.fieldname,
              )) &&
            !["amended_from", "naming_series"].includes(f.fieldname) &&
            !hiddenFields.includes(f.fieldname) &&
            (!f.hidden ||
              ["description", "content", "message_content"].includes(
                f.fieldname,
              )),
        );

        metaCacheRef.current[doctype] = filtered;
        setFields(filtered);
      } catch (err) {
        console.error("Error loading meta:", err);
        if (isMountedRef.current) {
          Toast.show({
            type: "error",
            text1: "Error",
            text2: "Failed to load form definition",
          });
          onClose();
        }
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    }
    loadMeta();
  }, [visible, doctype]);

  const initialValues = useMemo(() => {
    const values = {};
    fields.forEach((f) => {
      let val = "";
      if (f.fieldtype === "Date" && f.fieldname === "posting_date") {
        val = format(new Date(), "yyyy-MM-dd");
      } else if (employeeDetails) {
        if (f.fieldname === "employee") val = employeeDetails.name || "";
        else if (f.fieldname === "employee_name")
          val = employeeDetails.employee_name || "";
        else if (f.fieldname === "department")
          val = employeeDetails.department || "";
        else if (f.fieldname === "company") val = employeeDetails.company || "";
      }
      values[f.fieldname] = val;
    });
    return values;
  }, [fields, employeeDetails]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.modalContainer, dynamicStyles.modalContainer]}
        >
          <View style={[styles.modalHeader, dynamicStyles.modalHeader]}>
            <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>
              {title || doctype}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons
                name="close"
                size={22}
                color={dynamicStyles.closeIcon.color}
              />
            </TouchableOpacity>
          </View>
          <CustomLoader visible={loading || isSaving} />
          {!loading && (
            <Formik
              initialValues={initialValues}
              enableReinitialize={true}
              onSubmit={async (values, { setSubmitting }) => {
                setIsSaving(true);
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
                  setIsSaving(false);
                  return;
                } else {
                  setInvalidFields({});
                }
                const tempName = `new-${doctype
                  .toLowerCase()
                  .replace(/ /g, "-")}-${Date.now()}`;

                try {
                  const doc = {
                    ...values,

                    // Required Frappe meta
                    doctype,
                    name: tempName,
                    docstatus: 0,
                    __islocal: 1,
                    __unsaved: 1,

                    // Optional but recommended
                    posting_date: format(new Date(), "yyyy-MM-dd"),
                  };

                  const saved = await saveDoc(doc);
                  if (!isMountedRef.current) return;

                  if (doctype === "Attendance Request") {
                    await submitSavedDoc(saved, doc);
                    if (!isMountedRef.current) return;
                  }

                  Toast.show({
                    type: "success",
                    text1: "Success",
                    text2:
                      doctype === "Attendance Request"
                        ? `${doctype} submitted successfully`
                        : `${doctype} saved successfully`,
                  });
                  if (typeof onSuccess === "function") {
                    onSuccess({ saved, tempDoc: doc, doctype });
                  }
                  onClose();
                } catch (err) {
                  const serverText =
                    (err && err.serverMessagesText) ||
                    err.message ||
                    String(err);
                  Toast.show({
                    type: "error",
                    text1: "Error",
                    text2: serverText,
                  });
                } finally {
                  setSubmitting(false);
                  setIsSaving(false);
                }
              }}
            >
              {(formikProps) => (
                <DoctypeFormFields
                  fields={fields}
                  invalidFields={invalidFields}
                  setInvalidFields={setInvalidFields}
                  positionsRef={positionsRef}
                  scrollRef={scrollRef}
                  isMountedRef={isMountedRef}
                  doctype={doctype}
                  onClose={onClose}
                />
              )}
            </Formik>
          )}
        </KeyboardAvoidingView>
        <Toast />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end", // Bottom sheet style usually, or center
    // If you want full screen center:
    // justifyContent: "center",
    // padding: 20
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "90%",
    // If full screen center:
    // borderRadius: 12,
    // flex: 1,
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
  noDataContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  noDataText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
});

export default DoctypeFormModal;

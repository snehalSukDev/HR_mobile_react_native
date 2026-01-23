import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Keyboard,
} from "react-native";
import { fnSearchLink, getResource } from "../../utils/frappeApi";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import CustomLoader from "../CustomLoader";

const MIN_SEARCH_LENGTH = 0;
const SEARCH_DEBOUNCE_MS = 200;
const MAX_LINK_RESULTS = 25;

const LinkField = ({
  field,
  value,
  onFieldChange,
  doctype,
  containerStyle,
  error,
}) => {
  const { colors, theme } = useTheme();
  const [results, setResults] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localValue, setLocalValue] = useState(String(value || ""));

  const isMountedRef = useRef(true);
  const debounceTimerRef = useRef(null);
  const inputRef = useRef(null);

  const dynamicStyles = useMemo(
    () => ({
      label: { color: colors.text },
      input: {
        borderColor: colors.border,
        backgroundColor: colors.card,
        color: colors.text,
      },
      dropdown: {
        backgroundColor: colors.card,
        borderColor: colors.border,
      },
      item: {
        borderBottomColor: theme === "dark" ? "#333" : "#f0f0f0",
      },
      itemText: { color: colors.text },
      placeholder: colors.textSecondary,
    }),
    [colors, theme],
  );

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (value !== localValue) {
      setLocalValue(String(value || ""));
    }
  }, [value, localValue]);

  const fetchResults = useCallback(
    async (searchText) => {
      const text = searchText || "";
      if (text.length < MIN_SEARCH_LENGTH) {
        if (!isMountedRef.current) return;
        setResults([]);
        setIsOpen(false);
        return;
      }

      if (!isMountedRef.current) return;

      setLoading(true);
      try {
        const res = await fnSearchLink(searchText, field.options, 0, doctype, {
          query: "",
          filters: {},
        });

        if (isMountedRef.current) {
          const arr = Array.isArray(res) ? res : [];
          setResults(arr.slice(0, MAX_LINK_RESULTS));
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Link search error:", err);
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    },
    [field.options, doctype],
  );

  const handleFocus = () => {
    setIsOpen(true);
    if (results.length === 0) {
      fetchResults(localValue);
    }
  };

  const handleTextChange = (text) => {
    setLocalValue(text);
    onFieldChange(field.fieldname, text);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    const searchText = text || "";
    if (searchText.length < MIN_SEARCH_LENGTH) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchResults(searchText);
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleSelect = async (item) => {
    const rawVal =
      (item && typeof item === "object"
        ? item.value || item.name || item.id || item.label
        : item) ?? "";
    const val = String(rawVal);

    setLocalValue(val);
    onFieldChange(field.fieldname, val);
    setIsOpen(false);
    // Do not blur or dismiss keyboard to prevent focus jumps
  };

  return (
    <View style={[styles.container, containerStyle]} zIndex={isOpen ? 1000 : 1}>
      <Text style={[styles.label, dynamicStyles.label]}>
        {field.label} {field.reqd ? "*" : ""}
      </Text>
      <View>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            dynamicStyles.input,
            error && styles.inputError,
          ]}
          value={localValue}
          onChangeText={handleTextChange}
          onFocus={handleFocus}
          onBlur={() => {
            setTimeout(() => {
              if (isMountedRef.current) setIsOpen(false);
            }, 200);
          }}
          placeholder={field.placeholder || field.label}
          placeholderTextColor={dynamicStyles.placeholder}
        />
        <CustomLoader visible={loading} />
      </View>

      {isOpen && results.length > 0 && (
        <View style={[styles.dropdown, dynamicStyles.dropdown]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={styles.dropdownScroll}
          >
            {results.map((item, index) => {
              const rawVal =
                (item && typeof item === "object"
                  ? item.value || item.name || item.id || item.label
                  : item) ?? "";
              const label =
                (item &&
                  typeof item === "object" &&
                  typeof item.description === "string" &&
                  item.description.trim()) ||
                (item &&
                  typeof item === "object" &&
                  typeof item.label === "string" &&
                  item.label) ||
                String(rawVal);

              return (
                <TouchableOpacity
                  key={`${field.fieldname}-${index}`}
                  style={[styles.item, dynamicStyles.item]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={[styles.itemText, dynamicStyles.itemText]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    position: "relative",
  },
  label: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e1e1e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fff",
    color: "#333",
  },
  inputError: {
    borderColor: "red",
  },
  loader: {
    position: "absolute",
    right: 12,
    top: 12,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e1e1e1",
    borderRadius: 8,
    marginTop: 4,
    zIndex: 9999,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  item: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  itemText: {
    fontSize: 14,
    color: "#333",
  },
});

export default React.memo(LinkField);

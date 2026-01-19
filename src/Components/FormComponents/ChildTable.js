import React, { useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import GenericField from "./GenericField";
import LinkField from "./LinkField";

const ChildTableRow = React.memo(
  ({ row, rowIndex, fields, onRowChange, doctype }) => {
    const handleFieldChange = (fieldname, newValue) => {
        onRowChange(rowIndex, fieldname, newValue);
    };

    return (
      <View style={styles.rowContainer}>
        <Text style={styles.rowTitle}>Row {rowIndex + 1}</Text>
        {fields.map((cf) => {
          const value = row[cf.fieldname];

          if (cf.fieldtype === "Link") {
            return (
              <LinkField
                key={cf.fieldname}
                field={cf}
                value={value}
                onFieldChange={handleFieldChange}
                doctype={doctype}
              />
            );
          }
          
          return (
            <GenericField
              key={cf.fieldname}
              field={cf}
              value={value}
              onFieldChange={handleFieldChange}
            />
          );
        })}
      </View>
    );
  }
);

const ChildTable = ({ table, values, setFieldValue, doctype }) => {
  const rows = Array.isArray(values) ? values : [];

  const handleAddRow = useCallback(() => {
    const newRow = {};
    table.fields.forEach((cf) => {
      newRow[cf.fieldname] = "";
    });
    setFieldValue(table.fieldname, [...rows, newRow]);
  }, [rows, table, setFieldValue]);

  const handleRowChange = useCallback(
    (rowIndex, fieldname, newValue) => {
      const newRows = [...rows];
      newRows[rowIndex] = { ...newRows[rowIndex], [fieldname]: newValue };
      setFieldValue(table.fieldname, newRows);
    },
    [rows, table.fieldname, setFieldValue]
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {table.label} ({table.options})
        </Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddRow}>
          <Text style={styles.addButtonText}>Add Row</Text>
        </TouchableOpacity>
      </View>

      {rows.length === 0 ? (
        <Text style={styles.noDataText}>No rows. Tap Add Row.</Text>
      ) : (
        rows.map((row, index) => (
          <ChildTableRow
            key={`${table.fieldname}-row-${index}`}
            row={row}
            rowIndex={index}
            fields={table.fields}
            onRowChange={handleRowChange}
            doctype={doctype}
          />
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    marginBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  addButton: {
    backgroundColor: "#e7f1ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addButtonText: {
    color: "#007bff",
    fontSize: 12,
    fontWeight: "600",
  },
  noDataText: {
    fontStyle: "italic",
    color: "#999",
    textAlign: "center",
    padding: 10,
  },
  rowContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  rowTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#999",
    marginBottom: 8,
    textTransform: "uppercase",
  },
});

export default React.memo(ChildTable);

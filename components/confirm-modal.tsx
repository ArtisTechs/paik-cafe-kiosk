import { Colors } from "@/constants/Colors";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ConfirmDialogProps {
  visible: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "primary" | "success";
}

const getConfirmBtnStyle = (type: string) => {
  switch (type) {
    case "primary":
      return { backgroundColor: Colors.primary };
    case "success":
      return { backgroundColor: Colors.success };
    case "danger":
    default:
      return { backgroundColor: Colors.danger };
  }
};

const getConfirmBtnTextColor = (type: string) => {
  if (type === "primary") return { color: Colors.secondary };
  return { color: "#fff" };
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  message,
  onConfirm,
  onCancel,
  confirmText = "Yes",
  cancelText = "No",
  type = "primary",
}) => (
  <Modal transparent visible={visible} animationType="fade">
    <View style={styles.overlay}>
      <View style={styles.container}>
        <Text style={styles.message}>{message}</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>{cancelText}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.confirmBtn, getConfirmBtnStyle(type)]}
            onPress={onConfirm}
          >
            <Text style={[styles.confirmBtnText, getConfirmBtnTextColor(type)]}>
              {confirmText}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

export default ConfirmDialog;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.32)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 32,
    width: 350,
    alignItems: "center",
  },
  message: {
    fontSize: 18,
    color: Colors.secondary,
    marginBottom: 28,
    textAlign: "center",
    fontWeight: "600",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    gap: 20,
  },
  cancelBtn: {
    backgroundColor: Colors.tertiary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  cancelBtnText: {
    color: "#333",
    fontWeight: "bold",
    fontSize: 16,
  },
  confirmBtn: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  confirmBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});

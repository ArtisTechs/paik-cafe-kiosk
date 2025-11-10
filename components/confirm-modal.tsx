import { Colors } from "@/constants/Colors";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type ConfirmDialogBaseProps = {
  visible: boolean;
  message?: string; // title or header
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "primary" | "success";
};

type ConfirmDialogProps = React.PropsWithChildren<ConfirmDialogBaseProps>;

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

const getConfirmBtnTextColor = (type: string) =>
  type === "primary" ? { color: Colors.secondary } : { color: "#fff" };

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  message,
  onConfirm,
  onCancel,
  confirmText = "Yes",
  cancelText = "No",
  type = "primary",
  children,
}) => (
  <Modal
    transparent
    visible={visible}
    animationType="fade"
    onRequestClose={onCancel}
  >
    <View style={styles.overlay}>
      <View style={styles.container}>
        {message && <Text style={styles.title}>{message}</Text>}

        {children && <View style={styles.childrenWrapper}>{children}</View>}

        <View style={styles.buttonRow}>
          {onCancel && (
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>{cancelText}</Text>
            </TouchableOpacity>
          )}
          {onConfirm && (
            <TouchableOpacity
              style={[styles.confirmBtn, getConfirmBtnStyle(type)]}
              onPress={onConfirm}
            >
              <Text
                style={[styles.confirmBtnText, getConfirmBtnTextColor(type)]}
              >
                {confirmText}
              </Text>
            </TouchableOpacity>
          )}
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
  title: {
    fontSize: 20,
    color: Colors.secondary,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  childrenWrapper: {
    width: "100%",
    marginBottom: 20,
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

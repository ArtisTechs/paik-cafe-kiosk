import ConfirmDialog from "@/components/confirm-modal";
import { Colors } from "@/constants/Colors";
import { CartItem } from "@/interface/items.interface";
import { STORAGE_KEY } from "@/keys";
import { getMenuItemPrice } from "@/services";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { usePathname, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  BackHandler,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const INACTIVITY_DURATION = 60000 * 5;
const PROMPT_TIMEOUT = 15000;

export default function ViewOrderScreen() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [confirmPaymentVisible, setConfirmPaymentVisible] = useState(false);
  const [inactivityPromptVisible, setInactivityPromptVisible] = useState(false);
  const [inactivityTimer, setInactivityTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [autoReturnTimer, setAutoReturnTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const pathname = usePathname();

  const router = useRouter();
  const isCartEmpty = cart.length === 0;

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => true;

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      return () => subscription.remove();
    }, [])
  );

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY.ORDERS);
      setCart(saved ? JSON.parse(saved) : []);
    })();
  }, []);

  const syncCart = async (updatedCart: CartItem[]) => {
    setCart(updatedCart);
    await AsyncStorage.setItem(STORAGE_KEY.ORDERS, JSON.stringify(updatedCart));
  };

  useFocusEffect(
    React.useCallback(() => {
      if (pathname === "/view-order-screen") {
        resetInactivityTimer();
      }

      return () => {
        if (pathname === "/view-order-screen") {
          if (inactivityTimer) clearTimeout(inactivityTimer);
          if (autoReturnTimer) clearTimeout(autoReturnTimer);
        }
      };
    }, [pathname])
  );

  const handleVariationChange = (idx: number, newVar: string) => {
    const updated = [...cart];
    updated[idx].variation = newVar;
    syncCart(updated);
  };

  const resetInactivityTimer = React.useCallback(() => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (autoReturnTimer) clearTimeout(autoReturnTimer);

    const inactivity = setTimeout(() => {
      setInactivityPromptVisible(true);
      const autoReturn = setTimeout(async () => {
        setInactivityPromptVisible(false);
        await AsyncStorage.removeItem(STORAGE_KEY.ORDERS);
        router.replace("/(tabs)/welcome-screen");
      }, PROMPT_TIMEOUT);
      setAutoReturnTimer(autoReturn);
    }, INACTIVITY_DURATION);

    setInactivityTimer(inactivity);
  }, [inactivityTimer, autoReturnTimer]);

  // Handle quantity change
  const handleQuantityChange = (idx: number, newQty: number) => {
    resetInactivityTimer();
    if (newQty < 1) return;
    const updated = [...cart];
    updated[idx].quantity = newQty;
    syncCart(updated);
  };

  // Handle delete
  const handleDelete = (index: number) => {
    setDeleteIndex(index);
    setConfirmVisible(true);
  };

  const totalPrice = cart.reduce(
    (sum, c) => sum + getMenuItemPrice(c.item, c.variation) * c.quantity,
    0
  );

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <Image
          source={require("../../assets/images/paik-logo.png")}
          style={styles.logo}
        />
        <Text style={styles.headerTitle}>View Order</Text>
      </View>
      <FlatList
        style={styles.cartList}
        data={cart}
        keyExtractor={(_, idx) => idx.toString()}
        renderItem={({ item, index }) => (
          <View style={styles.cartCard}>
            <Image
              source={
                item.item.photo
                  ? { uri: item.item.photo }
                  : require("../../assets/images/dine-in-icon.png")
              }
              style={styles.cartImg}
              resizeMode="cover"
            />
            <View style={styles.cartRight}>
              <Text style={styles.cartName}>
                {item.item.name} {"("}₱
                {getMenuItemPrice(item.item, item.variation).toFixed(2)}
                {")"}
              </Text>
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  onPress={() => handleQuantityChange(index, item.quantity - 1)}
                  style={styles.qtyBtn}
                >
                  <MaterialIcons name="remove" size={32} color="white" />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity
                  onPress={() => handleQuantityChange(index, item.quantity + 1)}
                  style={styles.qtyBtn}
                >
                  <MaterialIcons name="add" size={32} color="white" />
                </TouchableOpacity>
              </View>
              <View style={styles.variationRow}>
                {(item.item.variation || [""]).map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[
                      styles.variationWordBtn,
                      item.variation === v && styles.variationWordBtnActive,
                    ]}
                    onPress={() => handleVariationChange(index, v)}
                  >
                    <Text
                      style={[
                        styles.variationWordText,
                        item.variation === v && styles.variationWordTextActive,
                      ]}
                    >
                      {v || "N/A"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(index)}
                style={styles.deleteBtn}
              >
                <MaterialIcons
                  name="delete-outline"
                  size={32}
                  color={Colors.danger}
                />
              </TouchableOpacity>
              <Text style={styles.itemTotalPrice}>
                Total: ₱
                {(
                  getMenuItemPrice(item.item, item.variation) * item.quantity
                ).toFixed(2)}
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text
            style={{
              textAlign: "center",
              marginTop: 100,
              fontSize: 22,
              color: "#444",
            }}
          >
            No items in your order.
          </Text>
        }
        contentContainerStyle={{ padding: 32, paddingBottom: 200 }}
      />
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.returnBtn}
          onPress={() => {
            resetInactivityTimer();
            router.replace("/(tabs)/menu-screen");
          }}
        >
          <Text style={styles.returnText}>Return</Text>
        </TouchableOpacity>
        <View style={styles.footerCenter}>
          <Image
            source={require("../../assets/images/basket.png")}
            style={styles.basketImage}
            resizeMode="contain"
          />
          <Text style={styles.footerTotal}>
            TOTAL {cart.length} ITEM(S): ₱ {totalPrice.toFixed(2)}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.payBtn, isCartEmpty && { opacity: 0.4 }]}
          disabled={isCartEmpty}
          onPress={() => {
            if (!isCartEmpty) setConfirmPaymentVisible(true);
          }}
        >
          <Text style={styles.payText}>Proceed Payment</Text>
        </TouchableOpacity>
      </View>
      {confirmVisible && (
        <ConfirmDialog
          visible={confirmVisible}
          message="Are you sure you want to remove this item from your order?"
          confirmText="Remove"
          cancelText="Cancel"
          onCancel={() => {
            setConfirmVisible(false);
            setDeleteIndex(null);
          }}
          onConfirm={() => {
            if (deleteIndex !== null) {
              const updated = [...cart];
              updated.splice(deleteIndex, 1);
              syncCart(updated);
            }
            setConfirmVisible(false);
            setDeleteIndex(null);
          }}
          type="danger"
        />
      )}

      <ConfirmDialog
        visible={confirmPaymentVisible}
        message="Proceed Checkout?"
        onCancel={() => setConfirmPaymentVisible(false)}
        onConfirm={() => {
          setConfirmPaymentVisible(false);
          router.replace("/(tabs)/payment-screen");
        }}
        confirmText="Proceed"
        cancelText="Cancel"
        type="primary"
      >
        <View>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "bold",
              color: Colors.secondary,
              textAlign: "left",
              marginBottom: 10,
            }}
          >
            PAYMENT REMINDERS
          </Text>

          <Text style={styles.reminderText}>• Accepts paper bills only.</Text>
          <Text style={styles.reminderText}>
            • (₱20, ₱50, ₱100, ₱200, ₱500, ₱1000)
          </Text>
          <Text style={styles.reminderText}>
            • Demonetized or damaged bills will not be accepted.
          </Text>
          <Text style={styles.reminderText}>
            • Polymer bills and current notes accepted.
          </Text>
          <Text style={styles.reminderText}>
            • Insert the full amount within 120 seconds.
          </Text>
          <Text style={styles.reminderText}>
            • Bills are non-returnable once inserted.
          </Text>
          <Text style={styles.reminderText}>
            • Change will be given upon order delivery.
          </Text>

          <Text
            style={{
              color: "red",
              fontStyle: "italic",
              textAlign: "center",
              marginTop: 8,
            }}
          >
            In case of malfunction, please ask for staff assistance.
          </Text>
        </View>
      </ConfirmDialog>

      <ConfirmDialog
        visible={inactivityPromptVisible}
        message="Are you still there? If not, you'll be returned to the welcome screen."
        confirmText="Stay"
        cancelText="Return"
        onCancel={async () => {
          await AsyncStorage.removeItem(STORAGE_KEY.ORDERS);
          setInactivityPromptVisible(false);
          router.replace("/(tabs)/welcome-screen");
        }}
        onConfirm={() => {
          setInactivityPromptVisible(false);
          resetInactivityTimer();
        }}
        type="primary"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: Colors.background, paddingTop: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderBottomWidth: 3,
    borderBottomColor: Colors.secondary,
    marginBottom: 10,
  },
  logo: { width: 66, height: 66, borderRadius: 60, marginRight: 18 },
  headerTitle: {
    fontSize: 38,
    color: Colors.secondary,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  cartList: { flex: 1 },
  cartCard: {
    flexDirection: "row",
    backgroundColor: Colors.primary,
    borderRadius: 18,
    padding: 16,
    marginBottom: 30,
    alignItems: "center",
    elevation: 7,
    shadowColor: "#000",
    shadowOpacity: 0.13,
    shadowRadius: 10,
  },
  cartImg: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 18,
  },
  cartRight: { flex: 1 },
  variationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 5,
    gap: 10,
  },
  variationCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 4,
    backgroundColor: "#fff",
  },
  variationCircleActive: {
    backgroundColor: Colors.secondary,
  },
  variationWordBtn: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.secondary,
    backgroundColor: "#fff",
    marginRight: 6,
  },
  variationWordBtnActive: {
    backgroundColor: Colors.secondary,
  },
  variationWordText: {
    color: Colors.secondary,
    fontWeight: "bold",
    fontSize: 17,
    letterSpacing: 1,
  },
  variationWordTextActive: {
    color: "#fff",
  },
  cartPrice: {
    fontWeight: "bold",
    fontSize: 23,
    color: Colors.secondary,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 4,
  },
  qtyBtn: {
    backgroundColor: Colors.secondary,
    borderRadius: "50%",
    padding: 2,
    marginHorizontal: 3,
  },
  qtyText: {
    minWidth: 40,
    textAlign: "center",
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.secondary,
  },
  deleteBtn: {
    backgroundColor: "#fff",
    borderRadius: "50%",
    padding: 8,
    position: "absolute",
    right: 10,
    top: "50%",
    transform: [{ translateY: -16 }],
  },
  cartName: {
    fontWeight: "bold",
    fontSize: 19,
    color: Colors.secondary,
    marginTop: 2,
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    backgroundColor: Colors.secondary,
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    justifyContent: "space-between",
  },
  returnBtn: {
    backgroundColor: Colors.tertiary,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 20,
    minWidth: 90,
    marginRight: 12,
  },
  returnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 17,
    textAlign: "center",
  },
  footerCenter: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.secondary,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 14,
  },
  footerTotal: {
    color: Colors.primary,
    fontWeight: "bold",
    fontSize: 20,
  },
  payBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 22,
    minWidth: 160,
    alignItems: "center",
  },
  payText: {
    color: Colors.secondary,
    fontWeight: "bold",
    fontSize: 17,
  },
  itemTotalPrice: {
    fontWeight: "bold",
    color: Colors.secondary,
    fontSize: 16,
    marginTop: 2,
    marginBottom: 3,
  },
  basketImage: {
    width: 80,
    height: 80,
    marginRight: 5,
  },
  reminderText: {
    fontSize: 15,
    color: Colors.secondary,
    marginBottom: 4,
  },
});

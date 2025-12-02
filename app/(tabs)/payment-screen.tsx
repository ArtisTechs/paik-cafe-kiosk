import ConfirmDialog from "@/components/confirm-modal";
import Receipt from "@/components/receipt-component";
import { Colors } from "@/constants/Colors";
import { CartItem } from "@/interface/items.interface";
import { STORAGE_KEY } from "@/keys";
import {
  createOrder,
  extractTableNumberFromPosition,
  getCurrentPosition,
  getMenuItemPrice,
} from "@/services";
import { printReceipt } from "@/services/printer-service";
import webSocketServices from "@/services/web-socket-services";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");
const PRINT_INSTRUCTION_DURATION = 5;

const UI = {
  headerTitle: "PAYMENT",
  payTitle: "Insert Your Payment",
  paySubtitle: "Insert paper bills one at a time",
  rowOrderTotal: "Order Total",
  rowInserted: "Amount Inserted",
  rowRemaining: "Remaining Balance",
  secondsSuffix: "seconds",
  footerNotice: "In case of malfunction, please ask for staff assistance.",
  cancelBtn: "Cancel Order",
  returnBtn: "Return",
  confirmCancelTitle: "Cancel order?",
  confirmCancelMsg:
    "This will discard the current order and return to the Welcome screen.",
  confirmReturnTitle: "Return to previous page?",
  confirmReturnMsg: "You will go back to the previous page.",
  yesCancel: "Yes, cancel",
  stay: "Stay",
  yesReturn: "Return",
  paid: "Payment Complete",
  remindersTitle: "PAYMENT REMINDERS",
  reminders: [
    "Accepts paper bills only.",
    "(₱20, ₱50, ₱100, ₱200, ₱500, ₱1000).",
    "Demonitized or damaged bills will not be accepted.",
    "Polymer bills and current notes accepted.",
    "Insert the full amount within 120 seconds.",
    "Bills are non-returnable once inserted.",
    "Change will be given upon order delivery.",
  ],
};

function buildOrderPayload(
  cart: CartItem[],
  totalPrice: number,
  cash: number,
  orderType: string,
  tableNumber: string
) {
  const itemIds: string[] = [];
  const quantity: number[] = [];
  const variation: string[] = [];

  cart.forEach((item: CartItem) => {
    for (let i = 0; i < item.quantity; i++) {
      itemIds.push(item.item.id);
      quantity.push(item.quantity);
      variation.push(item.variation);
    }
  });

  const changeAmount = parseFloat((cash - totalPrice).toFixed(2));

  return {
    itemIds,
    quantity,
    variation,
    totalPrice: parseFloat(totalPrice.toFixed(2)),
    cash: parseFloat(cash.toFixed(2)),
    changeAmount: changeAmount < 0 ? 0 : changeAmount,
    orderStatus: "ONGOING",
    orderType: orderType === "DINE_IN" ? "DINE_IN" : "TAKE_OUT",
    tableNumber,
  };
}

const resolveTableNumber = async (): Promise<string> => {
  try {
    const pos = await getCurrentPosition();
    return extractTableNumberFromPosition(pos);
  } catch {
    return "";
  }
};

type WSMsg =
  | string
  | {
      type?: string;
      cmd?: string;
      action?: string;
      state?: string;
      status?: string;
      received?: number;
      total?: number;
      amount?: number;
      totalAmount?: number;
      controller?: string;
      table?: number;
    };

const PaymentScreen = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKE_OUT" | null>(
    null
  );
  const [tableNumber, setTableNumber] = useState<string>("");

  const [payCountdown, setPayCountdown] = useState<number>(120);
  const timeoutHandledRef = useRef(false);

  const instructionFadeAnim = React.useRef(new Animated.Value(1)).current;
  const completedFadeAnim = React.useRef(new Animated.Value(0)).current;
  const hasSavedOrder = React.useRef(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const router = useRouter();
  const [returning, setReturning] = useState(false);
  const [timer, setTimer] = useState(15);
  const [printing, setPrinting] = useState(false);
  const [printerError, setPrinterError] = useState<string | null>(null);
  const printedRef = useRef(false);
  const isFocused = useIsFocused();
  const countdownRef = useRef<any>(null);
  const [showPrintInstruction, setShowPrintInstruction] = useState(false);
  const [instructionTimer, setInstructionTimer] = useState(
    PRINT_INSTRUCTION_DURATION
  );
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReturnConfirm, setShowReturnConfirm] = useState(false);
  const openCancelModal = () => setShowCancelConfirm(true);
  const openReturnModal = () => setShowReturnConfirm(true);
  const doneSentRef = useRef(false);
  const returnCountdownStartedRef = useRef(false);
  const [printed, setPrinted] = useState(false);
  const [showOrderAgainPrompt, setShowOrderAgainPrompt] = useState(false);

  const wsSend = (msg: WSMsg) => {
    try {
      webSocketServices.send(msg as any);
    } catch {}
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const storedType = await AsyncStorage.getItem(STORAGE_KEY.ORDER_TYPE);
      if (mounted)
        setOrderType(storedType === "DINE_IN" ? "DINE_IN" : "TAKE_OUT");

      const saved = await AsyncStorage.getItem(STORAGE_KEY.ORDERS);
      if (mounted) setCart(saved ? JSON.parse(saved) : []);
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const loadPosition = async () => {
      try {
        const pos = await getCurrentPosition();
        const tn = extractTableNumberFromPosition(pos) || "";
        if (alive) setTableNumber(tn);
      } catch {
        if (alive) setTableNumber("");
      }
    };
    if (isFocused) loadPosition();
    return () => {
      alive = false;
    };
  }, [isFocused]);

  useEffect(() => {
    let mounted = true;

    const handleWebSocketMessage = (data: any) => {
      if (!mounted) return;

      let msg: WSMsg = data;
      if (typeof data === "string") {
        try {
          msg = JSON.parse(data);
        } catch {
          if (data.toUpperCase() === "ACTIVATED") return;
          if (data.toUpperCase() === "DEACTIVATED") return;
          return;
        }
      }

      if (typeof msg === "object" && msg) {
        const t = (msg.type || "").toLowerCase();
        if (t === "payment") {
          if (typeof msg.total === "number") {
            setReceivedAmount(Number(msg.total));
          } else if (typeof msg.received === "number") {
            setReceivedAmount((prev) =>
              Math.max(0, Number(prev) + Number(msg.received))
            );
          }
          if (msg.status === "complete") setPaymentComplete(true);
        }
      }
    };

    const onConnect = () => {
      wsSend({ type: "controller", status: "connected" });
    };

    if (isFocused && !loading) {
      webSocketServices.connect(handleWebSocketMessage);
      const h = setTimeout(onConnect, 300);
      return () => {
        clearTimeout(h);
        mounted = false;
        webSocketServices.close();
      };
    }

    return () => {
      mounted = false;
    };
  }, [isFocused, loading]);

  const totalAmount = cart.reduce(
    (sum, c) => sum + getMenuItemPrice(c.item, c.variation) * c.quantity,
    0
  );

  const sendActivate = React.useCallback((amount: number) => {
    const amt = Math.round(amount);
    wsSend({ type: "activate", totalAmount: amt });
  }, []);

  const sendDeactivate = React.useCallback(() => {
    wsSend({ type: "deactivate" });
  }, []);

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
    let t: ReturnType<typeof setTimeout> | null = null;
    if (!loading && cart.length > 0) {
      t = setTimeout(() => sendActivate(totalAmount), 800);
    }
    return () => {
      if (t) clearTimeout(t);
    };
  }, [loading, cart, totalAmount, sendActivate]);

  const amountLeft = Math.max(totalAmount - receivedAmount, 0);

  useEffect(() => {
    if (paymentComplete) return;
    setPayCountdown(120);
    timeoutHandledRef.current = false;
    const id = setInterval(() => {
      setPayCountdown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [loading, cart.length, paymentComplete]);

  useEffect(() => {
    if (paymentComplete) return;
    if (payCountdown > 0) return;
    if (timeoutHandledRef.current) return;
    timeoutHandledRef.current = true;

    try {
      sendDeactivate();
      webSocketServices.close();
    } catch {}

    router.replace("/(tabs)/view-order-screen");
  }, [payCountdown, paymentComplete, router, sendDeactivate]);

  useEffect(() => {
    if (!paymentComplete || !createdOrder) return;

    if (showPrintInstruction) {
      // Ensure instruction is visible and completed hidden
      instructionFadeAnim.setValue(1);
      completedFadeAnim.setValue(0);
    } else {
      // Hide instruction, then show completed
      Animated.timing(instructionFadeAnim, {
        toValue: 0,
        duration: 450,
        useNativeDriver: true,
      }).start(() => {
        Animated.timing(completedFadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [showPrintInstruction, paymentComplete, createdOrder]);

  useEffect(() => {
    if (paymentComplete && !hasSavedOrder.current && cart.length && orderType) {
      hasSavedOrder.current = true;
      const cash = receivedAmount;
      (async () => {
        const tn = tableNumber || (await resolveTableNumber());
        const order = buildOrderPayload(cart, totalAmount, cash, orderType, tn);
        await AsyncStorage.setItem(
          STORAGE_KEY.SAVED_ORDER,
          JSON.stringify(order)
        );
        createOrder(order)
          .then((res) => setCreatedOrder(res))
          .catch(() => setCreatedOrder(order));
      })();
    }
  }, [
    paymentComplete,
    cart,
    orderType,
    receivedAmount,
    totalAmount,
    tableNumber,
  ]);

  useEffect(() => {
    if (!paymentComplete || !createdOrder) return;
    setShowPrintInstruction(true);
    setInstructionTimer(PRINT_INSTRUCTION_DURATION);
    const id = setInterval(() => {
      setInstructionTimer((p) => {
        if (p <= 1) {
          clearInterval(id);
          handlePrint(createdOrder, cart);
          setShowPrintInstruction(false);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [paymentComplete, createdOrder, cart]);

  const handlePrint = React.useCallback(
    async (order: any, items: CartItem[]) => {
      if (printedRef.current || !order) return;
      printedRef.current = true;

      setPrinterError(null);
      try {
        setPrinting(true);
        await printReceipt(order, items);
      } catch (e) {
        setPrinterError(e instanceof Error ? e.message : String(e));
      } finally {
        setPrinting(false);
        setPrinted(true);
      }
    },
    [router]
  );

  useEffect(() => {
    if (!paymentComplete || !createdOrder) return;
    if (!printed) return;
    if (returnCountdownStartedRef.current) return;
    returnCountdownStartedRef.current = true;
    setReturning(false);
    const start = setTimeout(() => {
      setReturning(true);
      setTimer(15);
      countdownRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current!);
            countdownRef.current = null;
            setReturning(false);
            setShowOrderAgainPrompt(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, 1200);
    return () => clearTimeout(start);
  }, [paymentComplete, createdOrder, printed, router]);

  const sendDoneForTable = (tn: string | number | null | undefined) => {
    const n =
      typeof tn === "number" ? tn : parseInt(String(tn ?? "").trim(), 10);
    if (!Number.isFinite(n) || n <= 0) return;
    wsSend({ type: "done_order", table: n });
  };

  const confirmCancelOrder = async () => {
    try {
      sendDeactivate();
      webSocketServices.close();
    } catch {}
    await AsyncStorage.removeItem(STORAGE_KEY.ORDERS);
    await AsyncStorage.removeItem(STORAGE_KEY.SAVED_ORDER);
    setShowCancelConfirm(false);
    router.replace("/(tabs)/welcome-screen");
  };

  const confirmReturnPage = () => {
    try {
      sendDeactivate();
      webSocketServices.close();
    } catch {}
    setShowReturnConfirm(false);
    router.replace("/(tabs)/view-order-screen");
  };

  const navigateHomeAndReset = async () => {
    try {
      sendDeactivate();
      webSocketServices.close();
    } catch {}

    await AsyncStorage.removeItem(STORAGE_KEY.ORDERS);
    await AsyncStorage.removeItem(STORAGE_KEY.SAVED_ORDER);

    setShowOrderAgainPrompt(false);
    router.replace("/(tabs)/welcome-screen");
  };

  const handleOrderAgainYes = async () => {
    await navigateHomeAndReset();
  };

  const handleOrderAgainNo = async () => {
    if (!doneSentRef.current) {
      try {
        const tn = tableNumber || (await resolveTableNumber());
        if (orderType === "DINE_IN" && tn) {
          sendDoneForTable(tn);
        }
        doneSentRef.current = true;
      } catch {}
    }
    await navigateHomeAndReset();
  };

  useEffect(() => {
    if (!createdOrder) return;
    const t = setTimeout(() => {
      wsSend("REFRESH_ORDER_PAGE");
    }, 3000);
    return () => clearTimeout(t);
  }, [createdOrder]);

  if (loading || paymentComplete) {
    return (
      <View style={styles.container}>
        {showPrintInstruction ||
        (!printedRef.current && paymentComplete && createdOrder) ? (
          <Animated.View
            style={{
              opacity: instructionFadeAnim,
              alignItems: "center",
              width: "100%",
              flex: 1,
            }}
          >
            <View
              style={{
                width: "100%",
                alignItems: "flex-end",
                paddingHorizontal: 30,
                marginTop: 12,
                position: "absolute",
                right: 15,
                top: 100,
              }}
            >
              <TouchableOpacity
                onPress={() => handlePrint(createdOrder, cart)}
                style={styles.printBtn}
              >
                <MaterialIcons
                  name="print"
                  size={28}
                  color={Colors.secondary}
                />
              </TouchableOpacity>
            </View>
            <View style={{ position: "absolute", right: 40, top: 150 }}>
              <MaterialIcons
                name="arrow-upward"
                size={100}
                color={Colors.secondary}
                style={{ transform: [{ rotate: "30deg" }] }}
              />
            </View>
            <View style={{ position: "absolute", right: 40, top: 250 }}>
              <Text style={styles.printHint}>
                On the next screen, click the Print button to print your
                receipt.
              </Text>
            </View>
            <Text style={styles.redirectTitle}>
              Redirecting to print receipt…
            </Text>
            <Text style={styles.redirectText}>
              Click the <Text style={{ fontWeight: "bold" }}>print</Text> button
              to print the receipt.
            </Text>
            <View style={styles.redirectRow}>
              <ActivityIndicator
                size={18}
                color={Colors.secondary}
                style={{ marginRight: 10 }}
              />
              <Text style={styles.redirectText}>
                This screen will close in{" "}
              </Text>
              <Text style={styles.redirectCountdown}>{instructionTimer}</Text>
              <Text style={styles.redirectText}>
                {" "}
                second{instructionTimer > 1 ? "s" : ""}
              </Text>
            </View>
          </Animated.View>
        ) : (
          <Animated.View
            style={{
              opacity: completedFadeAnim,
              alignItems: "center",
              width: "100%",
            }}
          >
            <MaterialIcons
              name="check-circle"
              size={100}
              color={Colors.success}
              style={{ marginBottom: 10 }}
            />
            <Text style={styles.completeText}>{UI.paid}</Text>
            {createdOrder && <Receipt order={createdOrder} cart={cart} />}
            {returning && (
              <View style={{ alignItems: "center", marginTop: 24 }}>
                <ActivityIndicator size={40} color={Colors.secondary} />
                <Text style={styles.returningText}>
                  Returning to home in {timer} seconds...
                </Text>
              </View>
            )}
          </Animated.View>
        )}
      </View>
    );
  }

  if (!cart.length) {
    return (
      <View style={styles.container}>
        <Text style={{ color: "#fff", fontSize: 22, marginTop: 100 }}>
          No order to pay for.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={require("../../assets/images/paik-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>{UI.headerTitle}</Text>
      </View>

      <ScrollView
        style={{ width: "100%" }}
        contentContainerStyle={{ alignItems: "center", paddingBottom: 120 }}
      >
        <View style={styles.card}>
          <Text style={styles.payTitle}>{UI.payTitle}</Text>
          <Text style={styles.paySubtitle}>{UI.paySubtitle}</Text>

          <View style={styles.rowsWrap}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{UI.rowOrderTotal}</Text>
              <Text style={styles.rowValue}>{totalAmount.toFixed(2)} Php</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{UI.rowInserted}</Text>
              <Text style={styles.rowValue}>
                {receivedAmount.toFixed(2)} Php
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{UI.rowRemaining}</Text>
              <Text style={styles.rowValue}>
                {Math.max(amountLeft, 0).toFixed(2)} Php
              </Text>
            </View>
          </View>

          <Text style={styles.secondsText}>
            {payCountdown} {UI.secondsSuffix}
          </Text>
        </View>

        <View style={styles.remindersCard}>
          <Text style={styles.remindersTitle}>{UI.remindersTitle}</Text>
          <View style={{ marginTop: 10 }}>
            {UI.reminders.map((t, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.reminderText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footerCard}>
          <Text style={styles.footerText}>{UI.footerNotice}</Text>
        </View>
      </ScrollView>

      {!paymentComplete && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            onPress={openCancelModal}
            style={[styles.actionBtn, styles.cancelBtn]}
          >
            <MaterialIcons name="cancel" size={22} color="#fff" />
            <Text style={styles.actionText}>{UI.cancelBtn}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={openReturnModal}
            style={[styles.actionBtn, styles.returnBtn]}
          >
            <MaterialIcons name="undo" size={22} color="#fff" />
            <Text style={styles.actionText}>{UI.returnBtn}</Text>
          </TouchableOpacity>
        </View>
      )}

      <ConfirmDialog
        visible={showCancelConfirm}
        message={UI.confirmCancelMsg}
        onConfirm={confirmCancelOrder}
        onCancel={() => setShowCancelConfirm(false)}
        confirmText={UI.yesCancel}
        cancelText="No"
        type="danger"
      />

      <ConfirmDialog
        visible={showReturnConfirm}
        message={UI.confirmReturnMsg}
        onConfirm={confirmReturnPage}
        onCancel={() => setShowReturnConfirm(false)}
        confirmText={UI.yesReturn}
        cancelText={UI.stay}
        type="primary"
      />

      <ConfirmDialog
        visible={showOrderAgainPrompt}
        message="Would you like to place another order?"
        confirmText="Order Again"
        cancelText="Finish"
        onConfirm={handleOrderAgainYes}
        onCancel={handleOrderAgainNo}
        type="primary"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: "center",
    paddingTop: 32,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    width: "100%",
    justifyContent: "center",
    borderBottomWidth: 4,
    borderBottomColor: Colors.secondary,
    paddingBottom: 8,
    paddingHorizontal: 15,
  },
  logo: { width: 80, height: 80, borderRadius: 50, marginRight: 14 },
  title: {
    fontSize: 40,
    color: Colors.secondary,
    fontWeight: "bold",
    letterSpacing: 2,
  },

  card: {
    backgroundColor: Colors.secondary,
    marginTop: 24,
    alignSelf: "center",
    borderRadius: 22,
    paddingVertical: 26,
    paddingHorizontal: 28,
    alignItems: "center",
    width: width * 0.85,
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 14,
  },

  payTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 2,
  },
  paySubtitle: { color: "#fde7e7ff", fontSize: 14, marginBottom: 18 },

  rowsWrap: {
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  row: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  rowLabel: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  rowValue: { color: "#fff", fontSize: 16 },

  secondsText: {
    marginTop: 18,
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
  },

  footerCard: {
    backgroundColor: "#fff",
    marginTop: 14,
    alignSelf: "center",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 22,
    width: width * 0.85,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  footerText: { color: "#991b1b", fontSize: 14, textAlign: "center" },

  completeText: {
    color: Colors.success,
    fontSize: 24,
    marginTop: 5,
    textAlign: "center",
  },

  returningText: {
    color: Colors.secondary,
    fontWeight: "bold",
    fontSize: 16,
    marginTop: 6,
  },

  bottomBar: {
    position: "absolute",
    bottom: 18,
    left: 18,
    right: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 6,
  },
  cancelBtn: { backgroundColor: Colors.danger ?? "#cc2b2b" },
  returnBtn: { backgroundColor: Colors.primary },
  actionText: {
    color: "#fff",
    fontWeight: "bold",
    marginLeft: 8,
    fontSize: 16,
  },

  printBtn: {
    backgroundColor: Colors.primary,
    padding: 10,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.09,
  },
  printHint: {
    fontSize: 14,
    color: Colors.secondary,
    fontWeight: "bold",
    width: 150,
  },
  redirectTitle: {
    fontSize: 24,
    color: Colors.secondary,
    fontWeight: "bold",
    marginTop: 52,
    marginBottom: 12,
  },
  redirectText: { fontSize: 18, color: Colors.secondary, marginBottom: 8 },
  redirectRow: { flexDirection: "row", alignItems: "center", marginTop: 24 },
  redirectCountdown: {
    fontWeight: "bold",
    color: Colors.secondary,
    fontSize: 16,
  },
  remindersCard: {
    backgroundColor: "#fff",
    marginTop: 16,
    alignSelf: "center",
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 22,
    width: width * 0.85,
    elevation: 8,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  remindersTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    color: "#111827",
    letterSpacing: 0.5,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 8,
  },
  bullet: { fontSize: 18, lineHeight: 22, color: "#111827", marginRight: 8 },
  reminderText: { flex: 1, fontSize: 16, lineHeight: 22, color: "#111827" },
});

export default PaymentScreen;

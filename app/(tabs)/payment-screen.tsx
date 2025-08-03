import Receipt from "@/components/receipt-component";
import { Colors } from "@/constants/Colors";
import { CartItem } from "@/interface/items.interface";
import { STORAGE_KEY } from "@/keys";
import { createOrder, getMenuItemPrice } from "@/services";
import { printReceipt } from "@/services/printer-service";
import webSocketServices from "@/services/web-socket-services";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const { width } = Dimensions.get("window");
const PRINT_INSTRUCTION_DURATION = 5;

function buildOrderPayload(
  cart: CartItem[],
  totalPrice: number,
  cash: number,
  orderType: string
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
  };
}

const PaymentScreen = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKE_OUT" | null>(
    null
  );
  const instructionFadeAnim = React.useRef(new Animated.Value(1)).current;
  const completedFadeAnim = React.useRef(new Animated.Value(0)).current;
  const hasSavedOrder = React.useRef(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);
  const router = useRouter();
  const [returning, setReturning] = useState(false);
  const [timer, setTimer] = useState(15);
  const [printing, setPrinting] = useState(false);
  const [printerError, setPrinterError] = useState<string | null>(null);
  const isFocused = useIsFocused();
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const [showPrintInstruction, setShowPrintInstruction] = useState(false);
  const [instructionTimer, setInstructionTimer] = useState(
    PRINT_INSTRUCTION_DURATION
  );

  // Effect 1: Load cart and orderType
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

  // Effect 2: WebSocket connection — only when focused and not loading
  useEffect(() => {
    let mounted = true;

    const handleWebSocketMessage = (data: any) => {
      if (!mounted) return;

      // Use requestAnimationFrame to schedule state updates after render
      requestAnimationFrame(() => {
        if (data.amount !== undefined) {
          setReceivedAmount(Number(data.amount));
        }
        if (data.status === "complete") {
          setPaymentComplete(true);
        }
      });
    };

    if (isFocused && !loading) {
      webSocketServices.connect(handleWebSocketMessage);
    }

    return () => {
      mounted = false;
      webSocketServices.close();
    };
  }, [isFocused, loading]);

  const totalAmount = cart.reduce(
    (sum, c) => sum + getMenuItemPrice(c.item, c.variation) * c.quantity,
    0
  );

  const sendActivate = React.useCallback((amount: number) => {
    webSocketServices.send({ command: "activate", totalAmount: amount });
    console.log("[WebSocket] Activate command sent with totalAmount:", amount);
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (!loading && cart.length > 0) {
      timer = setTimeout(() => {
        sendActivate(totalAmount);
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [loading, cart, totalAmount, sendActivate]);

  const amountLeft = Math.max(totalAmount - receivedAmount, 0);

  useEffect(() => {
    if (!showPrintInstruction && paymentComplete && createdOrder) {
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
  }, [
    showPrintInstruction,
    paymentComplete,
    createdOrder,
    instructionFadeAnim,
    completedFadeAnim,
  ]);

  useEffect(() => {
    let isMounted = true;
    if (showPrintInstruction && isMounted) {
      instructionFadeAnim.setValue(1);
      completedFadeAnim.setValue(0);
    }
    return () => {
      isMounted = false;
    };
  }, [showPrintInstruction]);

  useEffect(() => {
    if (paymentComplete && !hasSavedOrder.current && cart.length && orderType) {
      hasSavedOrder.current = true;
      const cash = receivedAmount;
      const order = buildOrderPayload(cart, totalAmount, cash, orderType);

      AsyncStorage.setItem(STORAGE_KEY.SAVED_ORDER, JSON.stringify(order));
      createOrder(order)
        .then((res) => setCreatedOrder(res))
        .catch(() => setCreatedOrder(order));
    }
  }, [paymentComplete, cart, orderType, receivedAmount, totalAmount]);

  useEffect(() => {
    if (paymentComplete && createdOrder) {
      setShowPrintInstruction(true);
      setInstructionTimer(PRINT_INSTRUCTION_DURATION);
      const timerId = setInterval(() => {
        setInstructionTimer((prev) => {
          if (prev <= 1) {
            clearInterval(timerId);
            handlePrint(createdOrder, cart);
            setShowPrintInstruction(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerId);
    }
  }, [paymentComplete, createdOrder]);

  const handlePrint = React.useCallback(
    async (order: any, cart: CartItem[]) => {
      try {
        setPrinting(true);
        setPrinterError(null);
        await printReceipt(order, cart);
        setPrinting(false);
      } catch (err: any) {
        setPrinterError(err?.message || "Failed to print receipt.");
        setPrinting(false);
      }
    },
    []
  );

  useEffect(() => {
    if (paymentComplete && createdOrder) {
      const processPaymentComplete = async () => {
        setReturning(false);

        setTimeout(() => {
          setReturning(true);
          setTimer(15);

          countdownRef.current = setInterval(() => {
            setTimer((prev) => {
              if (prev <= 1) {
                clearInterval(countdownRef.current!);
                countdownRef.current = null;
                AsyncStorage.removeItem(STORAGE_KEY.ORDERS);
                setTimeout(() => router.replace("/(tabs)/welcome-screen"), 0);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        }, 1200);
      };

      processPaymentComplete();
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [paymentComplete, createdOrder, cart, handlePrint, router]);

  if (loading || paymentComplete) {
    return (
      <View style={styles.container}>
        {showPrintInstruction ? (
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
                style={{
                  backgroundColor: Colors.primary,
                  padding: 10,
                  borderRadius: 28,
                  flexDirection: "row",
                  alignItems: "center",
                  elevation: 6,
                  shadowColor: "#000",
                  shadowOpacity: 0.09,
                }}
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
              <Text
                style={{
                  fontSize: 14,
                  color: Colors.secondary,
                  fontWeight: "bold",
                  width: 150,
                }}
              >
                On the next screen, click the Print button to print your
                receipt.
              </Text>
            </View>

            <Text
              style={{
                fontSize: 24,
                color: Colors.secondary,
                fontWeight: "bold",
                marginTop: 52,
                marginBottom: 12,
              }}
            >
              Redirecting to print receipt…
            </Text>
            <Text
              style={{ fontSize: 18, color: Colors.secondary, marginBottom: 8 }}
            >
              Click the <Text style={{ fontWeight: "bold" }}>print</Text> button
              to print the receipt.
            </Text>
            <Text
              style={{ color: Colors.secondary, fontSize: 16, marginTop: 24 }}
            >
              This screen will close in{" "}
              <Text style={{ fontWeight: "bold" }}>{instructionTimer}</Text>{" "}
              second{instructionTimer > 1 ? "s" : ""}
            </Text>
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
            <Text style={styles.completeText}>Payment Complete</Text>
            {createdOrder && <Receipt order={createdOrder} cart={cart} />}
            {returning && (
              <View style={{ alignItems: "center", marginTop: 24 }}>
                <ActivityIndicator size={40} color={Colors.primary} />
                <Text
                  style={{
                    color: Colors.secondary,
                    fontWeight: "bold",
                    fontSize: 16,
                    marginTop: 6,
                  }}
                >
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
        <Text style={styles.title}>PAYMENT</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.waitingText}>
          {amountLeft === 0 ? "Payment Complete" : "Waiting For Payment"}
        </Text>
        {amountLeft !== 0 && (
          <ActivityIndicator
            size={100}
            color={Colors.primary}
            style={{ marginVertical: 24 }}
          />
        )}
        <Text style={styles.infoText}>
          Received{" "}
          <Text style={{ fontWeight: "bold" }}>
            ₱{receivedAmount.toFixed(2)}
          </Text>{" "}
          of{" "}
          <Text style={{ fontWeight: "bold" }}>₱{totalAmount.toFixed(2)}</Text>
        </Text>
        {amountLeft > 0 ? (
          <Text style={styles.infoText}>
            Please insert{" "}
            <Text style={{ fontWeight: "bold" }}>₱{amountLeft.toFixed(2)}</Text>{" "}
            more.
          </Text>
        ) : (
          <Text style={styles.infoText}>Thank you for your payment!</Text>
        )}
      </View>
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
  logo: {
    width: 80,
    height: 80,
    borderRadius: 50,
    marginRight: 14,
  },
  title: {
    fontSize: 40,
    color: Colors.secondary,
    fontWeight: "bold",
    letterSpacing: 2,
  },
  card: {
    backgroundColor: Colors.secondary,
    marginTop: 54,
    alignSelf: "center",
    borderRadius: 22,
    padding: 38,
    alignItems: "center",
    width: width * 0.75,
    elevation: 12,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 14,
  },
  waitingText: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
  },
  infoText: {
    color: "#fff",
    fontSize: 18,
    marginTop: 5,
    textAlign: "center",
  },
  completeText: {
    color: Colors.success,
    fontSize: 24,
    marginTop: 5,
    textAlign: "center",
  },
});

export default PaymentScreen;

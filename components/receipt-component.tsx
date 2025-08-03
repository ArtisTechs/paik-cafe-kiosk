import { Colors } from "@/constants/Colors";
import { CartItem } from "@/interface/items.interface";
import { getMenuItemPrice } from "@/services";
import React from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";

const { width } = Dimensions.get("window");

type ReceiptProps = {
  order: any;
  cart: CartItem[];
};

export default function Receipt({ order, cart }: ReceiptProps) {
  if (!order) return null;

  const orderItems = cart.map((cartItem, idx) => ({
    name: cartItem.item?.name,
    variation: cartItem.variation,
    quantity: cartItem.quantity,
    price: getMenuItemPrice(cartItem.item, cartItem.variation),
    total:
      getMenuItemPrice(cartItem.item, cartItem.variation) * cartItem.quantity,
  }));

  const orderTypeLabel =
    order.orderType === "DINE_IN"
      ? "Dine In"
      : order.orderType === "TAKE_OUT"
      ? "Take Out"
      : order.orderType;

  return (
    <View style={styles.receiptContainer}>
      <Text style={styles.receiptTitle}>RECEIPT</Text>
      <Text style={styles.orderNumber}>
        Order No:{" "}
        <Text style={{ fontWeight: "bold" }}>{order.orderNo || "N/A"}</Text>
      </Text>
      <Text style={styles.receiptSub}>
        Order Type: <Text style={{ fontWeight: "bold" }}>{orderTypeLabel}</Text>
      </Text>
      <View style={styles.receiptLine} />

      {/* Column Headers */}
      <View style={[styles.row, { marginBottom: 5 }]}>
        <Text style={[styles.cellItem, styles.headerCell]}>Item</Text>
        <Text style={[styles.cellVar, styles.headerCell]}>Var.</Text>
        <Text style={[styles.cellQty, styles.headerCell]}>Qty</Text>
        <Text style={[styles.cellPrice, styles.headerCell]}>Price</Text>
        <Text style={[styles.cellTotal, styles.headerCell]}>Total</Text>
      </View>

      {/* Rows */}
      {orderItems.map((item, idx) => (
        <View style={styles.row} key={idx}>
          <Text style={styles.cellItem} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.cellVar} numberOfLines={1}>
            {item.variation}
          </Text>
          <Text style={styles.cellQty}>{item.quantity}</Text>
          <Text style={styles.cellPrice}>₱{item.price.toFixed(2)}</Text>
          <Text style={styles.cellTotal}>₱{item.total.toFixed(2)}</Text>
        </View>
      ))}

      <View style={styles.receiptLine} />
      <Text style={styles.receiptTotal}>
        Total: ₱{order.totalPrice.toFixed(2)}
      </Text>
      <Text style={styles.receiptTotal}>Cash: ₱{order.cash.toFixed(2)}</Text>
      <Text style={styles.receiptTotal}>
        Change: ₱{order.changeAmount.toFixed(2)}
      </Text>
      <View style={{ marginTop: 18 }}>
        <Text style={{ color: "#888", fontSize: 14 }}>
          Thank you for your order!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  receiptContainer: {
    marginTop: 30,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
    width: width * 0.8,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  receiptTitle: {
    fontWeight: "bold",
    fontSize: 28,
    color: Colors.secondary,
    letterSpacing: 2,
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 18,
    color: Colors.secondary,
    marginBottom: 10,
  },
  receiptSub: {
    fontSize: 16,
    color: "#555",
    marginBottom: 2,
  },
  receiptLine: {
    width: "100%",
    height: 1,
    backgroundColor: "#eee",
    marginVertical: 10,
  },
  row: {
    flexDirection: "row",
    width: "100%",
    marginBottom: 2,
  },
  headerCell: {
    fontWeight: "bold",
    color: Colors.secondary,
  },
  cellItem: {
    flex: 2.1, // Item name (more space)
    fontSize: 15,
    color: "#222",
  },
  cellVar: {
    flex: 1, // Variation
    fontSize: 15,
    color: "#222",
    textAlign: "center",
  },
  cellQty: {
    flex: 0.6,
    fontSize: 15,
    color: "#222",
    textAlign: "center",
  },
  cellPrice: {
    flex: 1,
    fontSize: 15,
    color: "#222",
    textAlign: "right",
    paddingRight: 3,
  },
  cellTotal: {
    flex: 1.1,
    fontSize: 15,
    color: "#222",
    textAlign: "right",
    paddingLeft: 3,
  },
  receiptTotal: {
    fontWeight: "bold",
    fontSize: 18,
    color: Colors.secondary,
    marginTop: 2,
  },
});

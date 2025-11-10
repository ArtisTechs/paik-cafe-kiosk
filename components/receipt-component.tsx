import { CartItem } from "@/interface/items.interface";
import { getMenuItemPrice } from "@/services";
import React from "react";
import { Dimensions, Platform, StyleSheet, Text, View } from "react-native";

const RECEIPT_WIDTH = Math.min(
  320,
  Math.floor(Dimensions.get("window").width * 0.9)
);
const MONO = Platform.select({
  ios: "Courier New",
  android: "monospace",
  default: "monospace",
});

type ReceiptProps = {
  order: any;
  cart: CartItem[];
};

export default function Receipt({ order, cart }: ReceiptProps) {
  if (!order) return null;

  const items = cart.map((c) => {
    const price = getMenuItemPrice(c.item, c.variation) || 0;
    return {
      name: c.item?.name || "",
      quantity: c.quantity || 0,
      price,
      lineTotal: price * (c.quantity || 0),
    };
  });

  const [printedAt] = React.useState(() => new Date());

  const qtyTotal = items.reduce((s, i) => s + i.quantity, 0);
  const subTotal = items.reduce((s, i) => s + i.lineTotal, 0);

  const toPeso = (n: number) => `₱${(n || 0).toFixed(2)}`;
  const orderType =
    order?.orderType === "DINE_IN"
      ? "Dine In"
      : order?.orderType === "TAKE_OUT"
      ? "Take Out"
      : order?.orderType || "—";

  const now = new Date();
  const dateText = printedAt.toLocaleDateString("en-PH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  // formatted time in 12-hour clock with AM/PM
  const timeText = printedAt.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <View style={[styles.paper, { width: RECEIPT_WIDTH }]}>
      {/* Header */}
      <Text style={styles.brand}>PAIK’S COFFEE</Text>
      <Text style={styles.brandSub}>FRIENDSHIP CLARK</Text>
      <Text style={styles.centerSmall}>
        Blk 23 Lot 08 Cruz Wood Plates St.{"\n"}
        Brgy. Anunas, Angeles City{"\n"}
        Contact No. 0954 255 9351
      </Text>

      <View style={styles.rule} />

      {/* Table number block */}
      <Text style={styles.sectionTitle}>TABLE NUMBER</Text>
      <View style={styles.rule} />
      <Text style={styles.centerSmall}>Time: {timeText}</Text>
      <Text style={styles.centerSmall}>Date: {dateText}</Text>
      <Text style={styles.centerSmall}>Order No.: {order?.orderNo || "—"}</Text>
      <Text style={styles.centerSmall}>Type: {orderType}</Text>
      <Text style={styles.centerSmall}>Table: {order?.tableNumber || ""}</Text>

      <View style={styles.rule} />

      {/* Items header */}
      <View style={[styles.row, { marginTop: 2 }]}>
        <Text style={[styles.cellItem, styles.header]}>Item</Text>
        <Text style={[styles.cellQty, styles.header, { textAlign: "center" }]}>
          Quantity
        </Text>
        <Text style={[styles.cellAmt, styles.header, { textAlign: "right" }]}>
          Amount
        </Text>
      </View>

      {/* Items */}
      {items.map((it, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.cellItem} numberOfLines={1}>
            {it.name}
          </Text>
          <Text style={[styles.cellQty, { textAlign: "center" }]}>
            {it.quantity}
          </Text>
          <Text style={[styles.cellAmt, { textAlign: "right" }]}>
            {toPeso(it.lineTotal)}
          </Text>
        </View>
      ))}

      <View style={styles.rule} />

      {/* Totals summary */}
      <View style={styles.row}>
        <Text style={styles.cellItem}>Qty Total:</Text>
        <Text style={[styles.cellQty, { textAlign: "center" }]}>
          {qtyTotal}
        </Text>
        <Text style={[styles.cellAmt, { textAlign: "right" }]}></Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.cellItem}>Subtotal:</Text>
        <Text style={styles.cellQty}></Text>
        <Text style={[styles.cellAmt, { textAlign: "right" }]}>
          {toPeso(subTotal)}
        </Text>
      </View>

      <View style={styles.rule} />

      <View style={styles.totalsBlock}>
        <Text style={styles.totalLine}>
          Total: {toPeso(order?.totalPrice ?? subTotal)}
        </Text>
        <Text style={styles.totalLine}>Cash: {toPeso(order?.cash ?? 0)}</Text>
        <Text style={styles.totalLine}>
          Change: {toPeso(order?.changeAmount ?? 0)}
        </Text>
      </View>

      <View style={styles.rule} />

      {/* Footer */}
      <Text style={styles.thanks}>Thank you</Text>
      <Text style={styles.centerSmall}>Please Come Again!</Text>
      <Text style={styles.centerTiny}>This is not an Official Receipt</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    backgroundColor: "#fff",
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 6,
    alignSelf: "center",
  },
  brand: {
    fontFamily: MONO,
    fontSize: 20,
    textAlign: "center",
    letterSpacing: 1,
  },
  brandSub: {
    fontFamily: MONO,
    fontSize: 16,
    textAlign: "center",
    marginBottom: 6,
  },
  centerSmall: {
    fontFamily: MONO,
    fontSize: 12,
    textAlign: "center",
  },
  centerTiny: {
    fontFamily: MONO,
    fontSize: 10,
    textAlign: "center",
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: MONO,
    fontSize: 18,
    textAlign: "center",
    marginVertical: 6,
  },
  rule: {
    height: 1,
    backgroundColor: "#000",
    opacity: 0.8,
    marginVertical: 8,
  },
  row: {
    flexDirection: "row",
    marginVertical: 2,
  },
  header: {
    fontFamily: MONO,
    fontSize: 12,
  },
  cellItem: {
    fontFamily: MONO,
    fontSize: 12,
    flex: 2,
  },
  cellQty: {
    fontFamily: MONO,
    fontSize: 12,
    flex: 1,
  },
  cellAmt: {
    fontFamily: MONO,
    fontSize: 12,
    flex: 1,
  },
  totalsBlock: {
    marginTop: 2,
  },
  totalLine: {
    fontFamily: MONO,
    fontSize: 14,
    textAlign: "left",
    marginVertical: 1,
  },
  thanks: {
    fontFamily: MONO,
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
  },
});

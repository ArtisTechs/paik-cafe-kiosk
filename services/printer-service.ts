import { CartItem } from "@/interface/items.interface";
import * as Print from "expo-print";
import { getMenuItemPrice } from ".";

export async function printReceipt(order: any, cart: CartItem[]) {
  const html = `
    <html>
      <body style="font-family: monospace; padding: 20px;">
        <h2 style="text-align:center; margin: 15px;">Paik's Coffee Receipt</h2>
        <p style="text-align:center; font-size: 18px;">Order No: ${
          order.orderNo || "N/A"
        }</p>
        <hr />
        <p style="font-size: 12px;"><strong>Order Type:</strong> ${
          order.orderType
        }</p>
        <hr />
        <div>
          ${cart
            .map((item) => {
              const price = getMenuItemPrice(item.item, item.variation);
              const total = price * item.quantity;
              return `
                <div style="margin-bottom: 8px; font-size: 10px;">
                  <div>
                    ${item.quantity} x ${item.item.name}
                    <span style="float:right; font-size: 10px;">${total.toFixed(
                      2
                    )}</span>
                  </div>
                  <div style="font-size: 10px;">
                    <span>${item.variation || "-"}</span>
                  </div>
                  <div style="font-size: 10px;">
                    <span>${price.toFixed(2)}</span>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
        <hr />
        <p style="font-size: 12px;"><strong>Total:</strong> ${
          order.totalPrice?.toFixed(2) ?? "0.00"
        }</p>
        <p style="font-size: 12px;"><strong>Cash:</strong> ${
          order.cash?.toFixed(2) ?? "0.00"
        }</p>
        <p style="font-size: 12px;"><strong>Change:</strong> ${
          order.changeAmount?.toFixed(2) ?? "0.00"
        }</p>
        <hr />
        <p style="text-align:center;">Thank you for your order!</p>
      </body>
    </html>
  `;

  await Print.printAsync({ html });
}

// services/printer-service.ts
import { CartItem } from "@/interface/items.interface";
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import { Platform } from "react-native";
import { getMenuItemPrice } from "./global-services";
// IMPORTANT: import getMenuItemPrice from a non-barrel to avoid cycles


function guessMimeFromUri(uri: string) {
  const m = uri.toLowerCase().match(/\.(png|jpe?g|gif|webp)$/);
  if (!m) return "image/png";
  const ext = m[1];
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  return "image/png";
}

async function assetToDataUri(moduleRef: number) {
  const asset = Asset.fromModule(moduleRef);
  await asset.downloadAsync();
  const uri = asset.localUri || asset.uri;
  if (!uri) throw new Error("Logo asset URI not resolved.");
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const mime = guessMimeFromUri(uri);
  return `data:${mime};base64,${base64}`;
}

export async function printReceipt(order: any, cart: CartItem[]) {
  if (Platform.OS === "web") {
    throw new Error("Printing is not supported on Web.");
  }

  // Use a relative require that Metro resolves from this file reliably
  const logoDataUri = await assetToDataUri(
    require("../assets/images/paik-logo.png")
  );

  const peso = (n: number | undefined) =>
    typeof n === "number" ? `₱${n.toFixed(2)}` : "₱0.00";

  const rowsHtml = cart
    .map((item) => {
      const price = getMenuItemPrice(item.item, item.variation) || 0;
      const total = price * (item.quantity || 0);
      const name = (item.item?.name || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      const varTxt = item.variation ? ` (${item.variation})` : "";
      return `
        <div style="margin-bottom:8px;font-size:10px;clear:both;">
          <div>${item.quantity} × ${name}${varTxt}
            <span style="float:right;">${total.toFixed(2)}</span>
          </div>
          <div style="font-size:10px;">${peso(price)}</div>
        </div>`;
    })
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1"
        />
        <title>Receipt</title>
        <style>
          body { font-family: monospace; padding: 20px; text-align: center; }
          hr { border: 1px dashed #000; margin: 10px 0; }
        </style>
      </head>
      <body>
        <img src="${logoDataUri}" alt="Paik's Coffee Logo" width="120" height="120"
             style="margin-top:10px;margin-bottom:10px;" />
        <h2 style="margin:5px 0;">PAIK’S COFFEE</h2>
        <h3 style="margin:0;">FRIENDSHIP CLARK</h3>
        <p style="font-size:12px;margin:10px 0;">
          Blk 23 Lot 08 Cruz Wood Plates St.<br />
          Brgy. Anunas, Angeles City<br />
          Contact No. 0954 255 9351
        </p>
        <hr />
        <h3 style="margin:10px 0;">TABLE NUMBER ${
          order?.tableNumber ?? "-"
        }</h3>
        <hr />
        <h3 style="margin:10px 0;">Order No: ${order?.orderNo ?? "N/A"}</h3>
        <p style="font-size:12px;"><strong>Order Type:</strong> ${
          order?.orderType ?? "-"
        }</p>
        <div style="text-align:left;display:inline-block;width:260px;">
          ${rowsHtml}
        </div>
        <hr />
        <p style="font-size:12px;"><strong>Total:</strong> ${peso(
          order?.totalPrice
        )}</p>
        <p style="font-size:12px;"><strong>Cash:</strong> ${peso(
          order?.cash
        )}</p>
        <p style="font-size:12px;"><strong>Change:</strong> ${peso(
          order?.changeAmount
        )}</p>
        <hr />
        <div style="margin-top:20px;text-align:center;">
          <p style="font-size:14px;margin:0;">Thank You</p>
          <p style="font-size:14px;margin:0;">Please Come Again!</p>
        </div>
        <p style="font-size:10px;margin-top:20px;">Printed at ${new Date().toLocaleString()}</p>
      </body>
    </html>
  `;

  await Print.printAsync({ html }); // opens system print dialog
}

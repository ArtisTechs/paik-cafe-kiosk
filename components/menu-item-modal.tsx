import { Colors } from "@/constants/Colors";
import { MenuItem } from "@/interface/items.interface";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image as ExpoImage } from "expo-image";
import React, { useEffect } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface Props {
  visible: boolean;
  item: MenuItem | null;
  variation: string;
  setVariation: (v: string) => void;
  quantity: number;
  setQuantity: (q: number) => void;
  onAdd: () => void;
  onCancel: () => void;
}
const MenuItemModal: React.FC<Props> = ({
  visible,
  item,
  variation,
  setVariation,
  quantity,
  setQuantity,
  onAdd,
  onCancel,
}) => {
  const hasVariation = !!item?.variation?.length;

  // Determine price per unit
  let pricePerUnit = 0;
  if (hasVariation) {
    const variationIndex = item.variation.findIndex((v) => v === variation);
    pricePerUnit = item.price?.[variationIndex] ?? 0;
  } else {
    // If price is an array with one item, or a number, handle both
    if (Array.isArray(item?.price)) {
      pricePerUnit = item?.price[0] ?? 0;
    } else {
      pricePerUnit = (item as any)?.price ?? 0;
    }
  }

  const totalPrice = pricePerUnit * quantity;

  // Auto-select first variation if visible and not set, but only if variations exist
  useEffect(() => {
    if (
      visible &&
      item &&
      hasVariation &&
      (!variation || !item.variation.includes(variation))
    ) {
      setVariation(item.variation[0]);
    }
  }, [visible, item, variation, setVariation, hasVariation]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Close "X" button */}
          <TouchableOpacity
            onPress={onCancel}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="close" size={28} color="#555" />
          </TouchableOpacity>
          {item && (
            <>
              {item.photo ? (
                <ExpoImage source={item.photo} style={styles.itemImage} />
              ) : (
                <MaterialIcons
                  name="restaurant-menu"
                  size={80}
                  color="#b0b0b0"
                />
              )}
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.price}>
                ₱ {pricePerUnit.toFixed(2)}
                {hasVariation && (
                  <Text style={{ fontWeight: "normal", fontSize: 13 }}>
                    {" "}
                    / {variation}
                  </Text>
                )}
              </Text>
              <Text style={styles.description}>
                {item.description || "No description provided."}
              </Text>

              {/* Variation Section - only if there are variations */}
              {hasVariation && (
                <View style={styles.variationWrapper}>
                  <View style={styles.variationButtonRow}>
                    {item.variation.map((v) => (
                      <TouchableOpacity
                        key={v}
                        onPress={() => setVariation(v)}
                        style={[
                          styles.variationButton,
                          variation === v && styles.variationButtonActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.variationButtonText,
                            variation === v && styles.variationButtonTextActive,
                          ]}
                        >
                          {v}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Quantity and Actions */}
              <View style={styles.quantityRow}>
                <TouchableOpacity
                  onPress={() => setQuantity(Math.max(1, quantity - 1))}
                  style={styles.quantityButton}
                >
                  <Text style={styles.quantityButtonText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.quantityText}>{quantity}</Text>
                <TouchableOpacity
                  onPress={() => setQuantity(quantity + 1)}
                  style={styles.quantityButton}
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.totalPriceLabel}>
                Total:{" "}
                <Text style={styles.totalPriceValue}>
                  ₱ {totalPrice.toFixed(2)}
                </Text>
              </Text>
              <TouchableOpacity style={styles.addButton} onPress={onAdd}>
                <Text style={styles.addButtonText}>Add to Cart</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default MenuItemModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    width: "85%",
    alignItems: "center",
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 16,
    right: 18,
    zIndex: 2,
    padding: 3,
  },
  itemImage: {
    width: 180,
    height: 180,
    borderRadius: 16,
    marginBottom: 12,
  },
  itemName: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.secondary,
    marginBottom: 6,
  },
  price: {
    fontSize: 18,
    color: Colors.tertiary,
    marginBottom: 6,
    fontWeight: "bold",
  },
  description: {
    fontSize: 14,
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
  },
  variationWrapper: {
    width: "100%",
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  variationLabel: {
    fontWeight: "bold",
    marginBottom: 6,
  },
  variationButtonRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 2,
  },
  variationButton: {
    backgroundColor: "#f2f2f2",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 18,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  variationButtonActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
    borderWidth: 1.5,
  },
  variationButtonText: {
    fontWeight: "bold",
    color: Colors.secondary,
    fontSize: 15,
  },
  variationButtonTextActive: {
    color: "#fff",
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 4,
  },
  quantityButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 8,
    marginHorizontal: 10,
  },
  quantityButtonText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  quantityText: {
    fontSize: 18,
    fontWeight: "bold",
    width: 32,
    textAlign: "center",
  },
  totalPriceLabel: {
    marginBottom: 12,
    fontWeight: "bold",
    fontSize: 17,
    color: Colors.tertiary,
  },
  totalPriceValue: {
    color: Colors.secondary,
    fontWeight: "bold",
    fontSize: 22,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 40,
    marginTop: 6,
    width: "100%",
  },
  addButtonText: {
    color: Colors.secondary,
    fontWeight: "bold",
    fontSize: 18,
    textAlign: "center",
  },
  cancelButton: {
    marginTop: 20,
    marginBottom: 10,
    alignSelf: "center",
    opacity: 0.7,
  },
  cancelButtonText: {
    color: "#333",
    fontWeight: "bold",
  },
});

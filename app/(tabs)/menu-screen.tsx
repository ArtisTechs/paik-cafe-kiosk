import ConfirmDialog from "@/components/confirm-modal";
import MenuItemModal from "@/components/menu-item-modal";
import PromoCarousel from "@/components/promo-carousel";
import { Colors } from "@/constants/Colors";
import { PromoImages } from "@/enum";
import { CartItem, ItemType, MenuItem } from "@/interface/items.interface";
import { STORAGE_KEY } from "@/keys";
import { getMenuItemPrice } from "@/services";
import { fetchItemList } from "@/services/item-services";
import { fetchItemTypes } from "@/services/item-type-services";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";
import { Image as ExpoImage } from "expo-image";
import * as Network from "expo-network";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

const INACTIVITY_DURATION = 60000 * 5; // 5 minutes
const PROMPT_TIMEOUT = 15000;

export default function MenuScreen() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [selectedVariation, setSelectedVariation] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const router = useRouter();
  const [confirmPaymentVisible, setConfirmPaymentVisible] = useState(false);
  const [inactivityPromptVisible, setInactivityPromptVisible] = useState(false);
  const [inactivityTimer, setInactivityTimer] = useState<NodeJS.Timeout | null>(
    null
  );
  const [autoReturnTimer, setAutoReturnTimer] = useState<NodeJS.Timeout | null>(
    null
  );

  const [cart, setCart] = useState<CartItem[]>([]);
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const networkState = await Network.getNetworkStateAsync();

        if (networkState.isConnected && networkState.isInternetReachable) {
          console.log("Fetching data from API...");
          const types = await fetchItemTypes();
          const menu = await fetchItemList();
          setItemTypes(types);
          setItems(menu);
          setSelectedType(types[0]?.id);

          await AsyncStorage.setItem(
            STORAGE_KEY.ITEM_TYPES,
            JSON.stringify(types)
          );
          await AsyncStorage.setItem(STORAGE_KEY.ITEMS, JSON.stringify(menu));
        } else {
          console.log("No internet connection, using cached data.");
          const types = JSON.parse(
            (await AsyncStorage.getItem(STORAGE_KEY.ITEM_TYPES)) || "[]"
          );
          const menu = JSON.parse(
            (await AsyncStorage.getItem(STORAGE_KEY.ITEMS)) || "[]"
          );
          setItemTypes(types);
          setItems(menu);
          setSelectedType(types[0]?.id);
        }
      } catch (err) {
        // On error (API/network/caching): fallback to cache
        const types = JSON.parse(
          (await AsyncStorage.getItem(STORAGE_KEY.ITEM_TYPES)) || "[]"
        );
        const menu = JSON.parse(
          (await AsyncStorage.getItem(STORAGE_KEY.ITEMS)) || "[]"
        );
        setItemTypes(types);
        setItems(menu);
        setSelectedType(types[0]?.id);
      }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const savedCart = await AsyncStorage.getItem(STORAGE_KEY.ORDERS);
        if (savedCart) {
          setCart(JSON.parse(savedCart));
        }
      } catch (err) {}
    })();
  }, []);

  useEffect(() => {
    if (isFocused) {
      resetInactivityTimer();
    } else {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      if (autoReturnTimer) clearTimeout(autoReturnTimer);
    }

    return () => {
      if (inactivityTimer) clearTimeout(inactivityTimer);
      if (autoReturnTimer) clearTimeout(autoReturnTimer);
    };
  }, [isFocused]);

  const resetInactivityTimer = () => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (autoReturnTimer) clearTimeout(autoReturnTimer);

    setInactivityTimer(
      setTimeout(() => {
        setInactivityPromptVisible(true);
        setAutoReturnTimer(
          setTimeout(() => {
            setInactivityPromptVisible(false);
            router.replace("/(tabs)/welcome-screen");
          }, PROMPT_TIMEOUT)
        );
      }, INACTIVITY_DURATION)
    );
  };

  const handleUserAction = () => {
    resetInactivityTimer();
  };

  const filteredItems = items.filter(
    (item) => item.itemType.id === selectedType
  );

  const handleAddToCart = async (
    item: MenuItem,
    variation: string,
    quantity: number
  ) => {
    setCart((prev) => {
      const idx = prev.findIndex(
        (c) => c.item.id === item.id && c.variation === variation
      );
      let updatedCart: CartItem[];
      if (idx > -1) {
        updatedCart = [...prev];
        updatedCart[idx].quantity += quantity;
      } else {
        updatedCart = [
          ...prev,
          {
            item,
            variation,
            quantity,
          },
        ];
      }

      AsyncStorage.setItem(STORAGE_KEY.ORDERS, JSON.stringify(updatedCart));
      return updatedCart;
    });
  };

  const handleItemClicked = async (item: MenuItem) => {
    setSelectedItem(item);
    setSelectedVariation(item.variation?.[0] || "");
    setQuantity(1);
    setModalVisible(true);
  };

  return (
    <View style={styles.page}>
      <View style={styles.headerContainer}>
        <View style={{ alignItems: "center" }}>
          <ExpoImage
            source={require("../../assets/images/paik-logo.png")}
            style={styles.logo}
            contentFit="contain"
          />
          <Text style={styles.typeButtonText}>Menu</Text>
        </View>

        <PromoCarousel images={PromoImages} height={180} width={500} />
      </View>
      <View style={styles.menuBody}>
        <View style={styles.sidebar}>
          <ScrollView contentContainerStyle={{ alignItems: "flex-end" }}>
            {itemTypes.map((type: any) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeButton,
                  selectedType === type.id && styles.typeButtonActive,
                ]}
                onPress={() => {
                  resetInactivityTimer();
                  setSelectedType(type.id);
                }}
              >
                <View style={styles.typeButtonContent}>
                  <Text
                    style={[
                      styles.typeButtonText,
                      selectedType === type.id && styles.typeButtonTextActive,
                    ]}
                  >
                    {type.name}
                  </Text>
                  {selectedType === type.id && (
                    <MaterialIcons
                      name="arrow-forward-ios"
                      size={24}
                      color="#fff"
                      style={styles.arrowIcon}
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        {loading ? (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              minHeight: 300,
            }}
          >
            <ActivityIndicator size={90} color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            data={filteredItems}
            numColumns={2}
            contentContainerStyle={styles.gridContainer}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => {
                  resetInactivityTimer();
                  handleItemClicked(item);
                }}
              >
                <View style={styles.itemCard}>
                  {item.photo ? (
                    <ExpoImage
                      source={item.photo}
                      style={styles.itemImage}
                      cachePolicy="disk"
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.itemImage, styles.iconImage]}>
                      <MaterialIcons
                        name="restaurant-menu"
                        size={150}
                        color={Colors.tertiary}
                      />
                    </View>
                  )}
                  <Text style={styles.itemName}>{item.name}</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        )}
        <MenuItemModal
          visible={modalVisible}
          item={selectedItem}
          variation={selectedVariation}
          setVariation={setSelectedVariation}
          quantity={quantity}
          setQuantity={setQuantity}
          onAdd={() => {
            if (!selectedItem) return;
            handleAddToCart(selectedItem, selectedVariation, quantity);
            setModalVisible(false);
          }}
          onCancel={() => setModalVisible(false)}
        />

        <ConfirmDialog
          visible={confirmVisible}
          message="Are you sure you want to cancel this order? This action cannot be undone."
          confirmText="Yes"
          cancelText="No"
          onCancel={() => setConfirmVisible(false)}
          onConfirm={async () => {
            setConfirmVisible(false);
            setCart([]);
            await AsyncStorage.removeItem(STORAGE_KEY.ORDERS);
            router.replace("/(tabs)/welcome-screen");
          }}
          type="danger"
        />

        <ConfirmDialog
          visible={confirmPaymentVisible}
          message="Proceed to payment?"
          confirmText="Proceed"
          cancelText="Cancel"
          onCancel={() => setConfirmPaymentVisible(false)}
          onConfirm={() => {
            setConfirmPaymentVisible(false);
            router.replace("/(tabs)/payment-screen");
          }}
        />

        <ConfirmDialog
          visible={inactivityPromptVisible}
          message="Are you still there? If not, you'll be returned to the welcome screen."
          confirmText="Stay"
          cancelText="Return"
          onCancel={async () => {
            setCart([]);
            await AsyncStorage.removeItem(STORAGE_KEY.ORDERS);
            setInactivityPromptVisible(false);
            router.replace("/(tabs)/welcome-screen");
            resetInactivityTimer();
          }}
          onConfirm={() => {
            setInactivityPromptVisible(false);
            resetInactivityTimer();
          }}
          type="primary"
        />

        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <ExpoImage
              source={require("../../assets/images/basket.png")}
              style={styles.basketImage}
              resizeMode="contain"
            />
            <Text style={styles.footerText}>TOTAL {cart.length} ITEM(S):</Text>
            <Text style={styles.footerTotal}>
              ₱{" "}
              {cart
                .reduce(
                  (sum, c) =>
                    sum + getMenuItemPrice(c.item, c.variation) * c.quantity,
                  0
                )
                .toFixed(2)}
            </Text>

            {cart.length > 0 && (
              <TouchableOpacity
                style={styles.footerEditButton}
                onPress={() => {
                  resetInactivityTimer();
                  router.replace("/(tabs)/view-order-screen");
                }}
              >
                <Text style={styles.footerEditText}>View Order</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.footerRight}>
            <TouchableOpacity
              style={[
                styles.footerProceedButton,
                cart.length === 0 && { backgroundColor: "#888" }, // grayed out
              ]}
              onPress={() => {
                resetInactivityTimer();
                setConfirmPaymentVisible(true);
              }}
              disabled={cart.length === 0}
            >
              <Text
                style={[
                  styles.footerProceedText,
                  cart.length === 0 && { color: "#eee" }, // dim text
                ]}
              >
                Proceed Payment
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.footerCancelButton}
              onPress={() => {
                resetInactivityTimer();
                setConfirmVisible(true);
              }}
            >
              <Text style={styles.footerCancelText}>Cancel Order</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerContainer: {
    display: "flex",
    flexDirection: "row",
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    paddingTop: 10,
    borderBottomWidth: 5,
    marginBottom: 5,
    borderBottomColor: Colors.secondary,
  },
  logo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 5,
  },
  menuBody: {
    flex: 1,
    flexDirection: "row",
    borderTopWidth: 5,
    paddingTop: 10,
    paddingBottom: 10,
    borderTopColor: Colors.secondary,
  },
  sidebar: {
    width: 220,
    backgroundColor: "transparent",
    paddingTop: 16,
    borderRightWidth: 2,
    borderRightColor: Colors.secondary,
    alignItems: "center",
  },
  typeButton: {
    backgroundColor: Colors.primary,
    borderRadius: 18,
    marginBottom: 18,
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 18,
    width: 200,
    elevation: 2,
    alignSelf: "flex-end",
  },
  typeButtonActive: {
    backgroundColor: "#12204a",
  },
  typeButtonText: {
    fontWeight: "bold",
    color: Colors.secondary,
    fontSize: 16,
  },
  typeButtonTextActive: {
    color: "#fff",
  },
  typeButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  arrowIcon: {
    marginLeft: 10,
  },
  gridContainer: {
    flexGrow: 1,
    padding: 12,
    paddingLeft: 40,
    paddingBottom: 300,
    alignItems: "flex-start",
    justifyContent: "flex-start",
  },
  itemCard: {
    alignItems: "center",
    margin: 12,
    width: (width - 120 - 60) / 3,
  },
  itemImage: {
    width: 150,
    height: 150,
    borderRadius: 14,
    marginBottom: 8,
  },
  itemName: {
    textAlign: "center",
    fontSize: 18,
    color: Colors.secondary,
    fontWeight: "600",
  },
  iconImage: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.secondary,
  },

  footer: {
    backgroundColor: Colors.secondary,
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 32,
    paddingVertical: 20,
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 150,
    width: "100%",
    zIndex: 999,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 2,
  },
  footerText: {
    color: "#fff",
    fontSize: 18,
    marginRight: 10,
    fontWeight: "600",
  },
  footerTotal: {
    color: Colors.primary,
    fontWeight: "bold",
    fontSize: 22,
    marginRight: 18,
  },
  footerRight: {
    flexDirection: "column",
    alignItems: "center",
    gap: 15,
  },
  footerEditButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 22,
    marginRight: 8,
  },
  footerEditText: {
    color: Colors.secondary,
    fontWeight: "bold",
    fontSize: 16,
  },
  footerProceedButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 22,
    width: 200,
    alignItems: "center",
  },
  footerProceedText: {
    color: Colors.secondary,
    fontWeight: "bold",
    fontSize: 16,
  },
  footerCancelButton: {
    backgroundColor: Colors.danger,
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 15,
    width: 200,
    alignItems: "center",
  },
  footerCancelText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  basketImage: {
    width: 80,
    height: 80,
    marginRight: 5,
  },
});

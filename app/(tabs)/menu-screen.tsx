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
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { Image as ExpoImage } from "expo-image";
import * as Network from "expo-network";
import { usePathname, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
  FlatList,
  RefreshControl,
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
  const [inactivityTimer, setInactivityTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [autoReturnTimer, setAutoReturnTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const isFocused = useIsFocused();
  const [refreshing, setRefreshing] = useState(false);
  const pathname = usePathname();

  // ---------- helpers ----------
  const isOutOfStock = useCallback((m: MenuItem) => {
    // supports common fields
    // treat <=0 or falsey availability as OOS
    const stockish =
      (typeof (m as any).stock === "number" && (m as any).stock <= 0) ||
      (typeof (m as any).quantity === "number" && (m as any).quantity <= 0);
    const flags =
      (m as any).isAvailable === false ||
      (m as any).available === false ||
      (m as any).inStock === false;
    return !!(stockish || flags);
  }, []);

  const ensureSelectedType = useCallback(
    (types: ItemType[]) => {
      if (!types?.length) {
        setSelectedType(null);
        return;
      }
      if (!selectedType || !types.some((t) => t.id === selectedType)) {
        setSelectedType(types[0].id);
      }
    },
    [selectedType]
  );

  const loadData = useCallback(async () => {
    setRefreshing(true);
    try {
      // use cache first
      const cachedTypes =
        JSON.parse(
          (await AsyncStorage.getItem(STORAGE_KEY.ITEM_TYPES)) || "[]"
        ) || [];
      const cachedMenu =
        JSON.parse((await AsyncStorage.getItem(STORAGE_KEY.ITEMS)) || "[]") ||
        [];
      if (cachedTypes.length || cachedMenu.length) {
        setItemTypes(cachedTypes);
        setItems(cachedMenu);
        ensureSelectedType(cachedTypes);
      }

      // then live fetch if online
      const net = await Network.getNetworkStateAsync();
      if (net.isConnected && net.isInternetReachable) {
        const [types, menu] = await Promise.all([
          fetchItemTypes(),
          fetchItemList(),
        ]);
        setItemTypes(types);
        setItems(menu);
        ensureSelectedType(types);
        await AsyncStorage.setItem(
          STORAGE_KEY.ITEM_TYPES,
          JSON.stringify(types)
        );
        await AsyncStorage.setItem(STORAGE_KEY.ITEMS, JSON.stringify(menu));
      }
    } catch {}
    setRefreshing(false);
  }, [ensureSelectedType]);

  // ---------- lifecycle ----------
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => true;
      const sub = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );
      return () => sub.remove();
    }, [])
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await loadData(); // initial and on mount
    })();
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      // refresh every time screen regains focus
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    (async () => {
      try {
        const savedCart = await AsyncStorage.getItem(STORAGE_KEY.ORDERS);
        if (savedCart) setCart(JSON.parse(savedCart));
      } catch {}
    })();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      if (pathname === "/menu-screen") {
        resetInactivityTimer();
      }

      return () => {
        if (pathname === "/menu-screen") {
          if (inactivityTimer) clearTimeout(inactivityTimer);
          if (autoReturnTimer) clearTimeout(autoReturnTimer);
        }
      };
    }, [pathname])
  );

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (autoReturnTimer) clearTimeout(autoReturnTimer);

    const inactivity = setTimeout(() => {
      setInactivityPromptVisible(true);
      const autoReturn = setTimeout(() => {
        setInactivityPromptVisible(false);
        router.replace("/(tabs)/welcome-screen");
      }, PROMPT_TIMEOUT);
      setAutoReturnTimer(autoReturn);
    }, INACTIVITY_DURATION);

    setInactivityTimer(inactivity);
  }, [inactivityTimer, autoReturnTimer]);

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
        updatedCart = [...prev, { item, variation, quantity }];
      }
      AsyncStorage.setItem(STORAGE_KEY.ORDERS, JSON.stringify(updatedCart));
      return updatedCart;
    });
  };

  const handleItemClicked = async (item: MenuItem) => {
    if (isOutOfStock(item)) return;
    setSelectedItem(item);
    setSelectedVariation(item.variation?.[0] || "");
    setQuantity(1);
    setModalVisible(true);
  };

  const filteredItems = useMemo(
    () => items.filter((it) => it?.itemType?.id === selectedType),
    [items, selectedType]
  );

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
        <PromoCarousel images={PromoImages} height={150} width={500} />
      </View>

      <View style={styles.menuBody}>
        {/* Sidebar types with pull-to-refresh for symmetry */}
        <View style={styles.sidebar}>
          <ScrollView contentContainerStyle={{ alignItems: "flex-end" }}>
            {itemTypes.map((type) => (
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

        {items.length === 0 ? (
          <View style={styles.centerWrap}>
            <ActivityIndicator size={90} color={Colors.secondary} />
          </View>
        ) : (
          <>
            <FlatList
              data={filteredItems}
              numColumns={3}
              contentContainerStyle={styles.gridContainer}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={loadData} />
              }
              renderItem={({ item }) => {
                const oos = isOutOfStock(item);
                const defVar = item.variation?.[0] || "";
                const price = getMenuItemPrice(item, defVar);

                const onSelect = () => {
                  if (oos) return;
                  resetInactivityTimer();
                  handleItemClicked(item);
                };

                return (
                  <TouchableOpacity
                    style={styles.itemWrap}
                    onPress={onSelect}
                    activeOpacity={0.9}
                    disabled={oos}
                  >
                    <View style={[styles.itemCard, oos && { opacity: 0.6 }]}>
                      <View style={{ alignItems: "center" }}>
                        {item.photo ? (
                          <ExpoImage
                            source={item.photo}
                            style={styles.itemImage}
                            cachePolicy="disk"
                            resizeMode="contain"
                          />
                        ) : (
                          <View style={[styles.itemImage, styles.iconImage]}>
                            <MaterialIcons
                              name="restaurant-menu"
                              size={120}
                              color={Colors.tertiary}
                            />
                          </View>
                        )}

                        {oos && (
                          <View style={styles.oosBadge}>
                            <Text style={styles.oosText}>OUT OF STOCK</Text>
                          </View>
                        )}

                        {!oos && item?.bestSeller && (
                          <View style={styles.bestBadge}>
                            <MaterialIcons
                              name="star"
                              size={14}
                              color="#3a2b00"
                            />
                            <Text style={styles.bestText}>BEST SELLER</Text>
                          </View>
                        )}
                      </View>

                      <Text numberOfLines={2} style={styles.itemName}>
                        {item.name}
                      </Text>

                      <View style={styles.priceRow}>
                        <Text style={styles.priceText}>{`₱ ${price.toFixed(
                          2
                        )}`}</Text>
                        {!oos && (
                          <TouchableOpacity
                            onPress={onSelect}
                            disabled={oos}
                            style={[
                              styles.addBtn,
                              oos && styles.addBtnDisabled,
                            ]}
                          >
                            <Text
                              style={[
                                styles.addBtnText,
                                oos && styles.addBtnTextDisabled,
                              ]}
                            >
                              Add
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
            {refreshing && (
              <View style={{ position: "absolute", right: 20, top: 5 }}>
                <ActivityIndicator size={36} color={Colors.secondary} />
              </View>
            )}
          </>
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

            {/* {cart.length > 0 && (
              <TouchableOpacity
                style={styles.footerEditButton}
                onPress={() => {
                  resetInactivityTimer();
                  router.replace("/(tabs)/view-order-screen");
                }}
              >
                <Text style={styles.footerEditText}>View Order</Text>
              </TouchableOpacity>
            )} */}
          </View>
          <View style={styles.footerRight}>
            <TouchableOpacity
              style={[
                styles.footerProceedButton,
                cart.length === 0 && { backgroundColor: "#888" },
              ]}
              onPress={() => {
                resetInactivityTimer();
                router.replace("/(tabs)/view-order-screen");
              }}
              disabled={cart.length === 0}
            >
              <Text
                style={[
                  styles.footerProceedText,
                  cart.length === 0 && { color: "#eee" },
                ]}
              >
                Proceed to Checkout
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
  page: { flex: 1, backgroundColor: Colors.background },
  headerContainer: {
    display: "flex",
    flexDirection: "row",
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    paddingTop: 1,
    borderBottomWidth: 5,
    marginBottom: 3,
    borderBottomColor: Colors.secondary,
  },
  logo: { width: 100, height: 100, borderRadius: 60, marginBottom: 5 },
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
  typeButtonActive: { backgroundColor: "#12204a" },
  typeButtonText: { fontWeight: "bold", color: Colors.secondary, fontSize: 16 },
  typeButtonTextActive: { color: "#fff" },
  typeButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  arrowIcon: { marginLeft: 10 },
  gridContainer: {
    flexGrow: 1,
    padding: 12,
    paddingLeft: 20,
    paddingBottom: 300,
    alignItems: "flex-start",
    justifyContent: "flex-start",
  },
  centerWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 300,
  },
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 12,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  itemImage: {
    width: 150,
    height: 150,
    borderRadius: 10,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  itemName: {
    textAlign: "left",
    fontSize: 16,
    color: Colors.secondary,
    fontWeight: "700",
    minHeight: 42,
  },
  iconImage: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.secondary,
  },
  oosBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
  },
  oosText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
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
  footerLeft: { flexDirection: "row", alignItems: "center", flex: 2 },
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
  footerRight: { flexDirection: "column", alignItems: "center", gap: 15 },
  footerEditButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 22,
    marginRight: 8,
  },
  footerEditText: { color: Colors.secondary, fontWeight: "bold", fontSize: 16 },
  footerProceedButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 22,
    width: 250,
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
    width: 250,
    alignItems: "center",
  },
  footerCancelText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  basketImage: { width: 80, height: 80, marginRight: 5 },
  itemWrap: { padding: 10, width: (width - 200 - 60) / 3 },

  priceRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceText: { fontSize: 14, color: "#666", fontWeight: "600" },

  addBtn: {
    backgroundColor: "#FFE600",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addBtnText: { color: Colors.secondary, fontWeight: "800", fontSize: 14 },

  addBtnDisabled: { backgroundColor: "#ccc" },
  addBtnTextDisabled: { color: "#666" },
  bestBadge: {
    position: "absolute",
    bottom: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: "#FFE08A",
    borderWidth: 1,
    borderColor: "#D4AF37",
  },
  bestText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#3a2b00",
  },
});

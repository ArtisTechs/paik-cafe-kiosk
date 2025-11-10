import PromoCarousel from "@/components/promo-carousel";
import { Colors } from "@/constants/Colors";
import { PromoImages } from "@/enum";
import { STORAGE_KEY } from "@/keys";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React from "react";
import {
  BackHandler,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Stage = "LANDING" | "MODE";

export default function WelcomeScreen() {
  const router = useRouter();
  const [stage, setStage] = React.useState<Stage>("LANDING");

  const handleSelect = async (mode: "DINE_IN" | "TAKE_OUT") => {
    await AsyncStorage.setItem(STORAGE_KEY.ORDER_TYPE, mode);
    router.push({ pathname: "/menu-screen", params: { mode } });
  };

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (stage === "MODE") {
          setStage("LANDING");
          return true;
        }
        return true;
      };

      const sub = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );
      return () => sub.remove();
    }, [stage])
  );

  const handleStartOrdering = React.useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY.ORDERS);
    await AsyncStorage.removeItem(STORAGE_KEY.SAVED_ORDER);
    setStage("MODE");
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image
        source={require("../../assets/images/coffee-background.png")}
        style={styles.coffeeBackground}
        resizeMode="cover"
      />

      <Text style={styles.title}>Welcome to Paik’s Coffee!</Text>

      <Image
        source={require("../../assets/images/paik-logo.png")}
        style={styles.logo}
      />

      {stage === "LANDING" && (
        <>
          <TouchableOpacity style={styles.cta} onPress={handleStartOrdering}>
            <Text style={styles.ctaText}>Start Ordering</Text>
          </TouchableOpacity>
        </>
      )}

      {stage === "MODE" && (
        <>
          <Text style={styles.subtitle}>What would you like to do today?</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.button}
              onPress={() => handleSelect("DINE_IN")}
            >
              <Image
                source={require("../../assets/images/dine-in-icon.png")}
                style={styles.takeoutImage}
                resizeMode="contain"
              />
              <Text style={styles.buttonText}>Dine In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={() => handleSelect("TAKE_OUT")}
            >
              <Image
                source={require("../../assets/images/takeout-icon.png")}
                style={styles.takeoutImage}
                resizeMode="contain"
              />
              <Text style={styles.buttonText}>Take Out</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      <PromoCarousel images={PromoImages} height={400} width={850} />
      <View style={styles.blueArcContainer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    height: "100%",
    width: "100%",
    backgroundColor: Colors.background,
    alignItems: "center",
    paddingTop: 260,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: Colors.secondary,
    marginBottom: 8,
    textAlign: "center",
  },
  logo: {
    width: 200,
    height: 200,
    borderRadius: 50,
    marginBottom: 16,
    marginTop: 8,
  },
  // LANDING
  cta: {
    backgroundColor: "#ffe600",
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginTop: 8,
    elevation: 3,
    marginBottom: 90,
  },
  ctaText: { fontSize: 20, fontWeight: "800", color: Colors.secondary },
  drinksRow: { width: "100%", height: 180, marginTop: 24 },

  // MODE
  subtitle: {
    fontSize: 24,
    color: Colors.secondary,
    marginBottom: 20,
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    marginBottom: 30,
    justifyContent: "center",
    gap: 50,
  },
  button: {
    backgroundColor: "#ffe600",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: 16,
    width: 200,
    height: 250,
    shadowColor: Colors.secondary,
    shadowOpacity: 0.2,
    shadowOffset: { width: 2, height: 2 },
    elevation: 3,
    marginHorizontal: 10,
  },
  buttonText: {
    fontWeight: "bold",
    color: Colors.secondary,
    fontSize: 26,
  },
  takeoutImage: { width: 120, height: 180 },

  blueArcContainer: {
    position: "absolute",
    bottom: -100,
    left: -50,
    right: 0,
    height: 300,
    width: "115%",
    backgroundColor: Colors.secondary,
    borderRadius: "100%",
    zIndex: -1,
  },
  coffeeBackground: {
    width: "100%",
    height: 450,
    position: "absolute",
    top: 20,
    left: 0,
    zIndex: -1,
  },
});

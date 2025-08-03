import PromoCarousel from "@/components/promo-carousel";
import { Colors } from "@/constants/Colors";
import { PromoImages } from "@/enum";
import { STORAGE_KEY } from "@/keys";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function WelcomeScreen() {
  const router = useRouter();

  const handleSelect = async (mode: "DINE_IN" | "TAKE_OUT") => {
    await AsyncStorage.setItem(STORAGE_KEY.ORDER_TYPE, mode);
    router.push({ pathname: "/menu-screen", params: { mode } });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Welcome to Paik’s Coffee!</Text>
      <Image
        source={require("../../assets/images/paik-logo.png")}
        style={styles.logo}
      />
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
      <PromoCarousel images={PromoImages} />
      <View style={styles.blueArcContainer}></View>
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
    paddingTop: 120,
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
    padding: 20,
    borderRadius: 16,
    width: 250,
    height: 300,
    shadowColor: Colors.secondary,
    shadowOpacity: 0.2,
    shadowOffset: { width: 2, height: 2 },
    elevation: 3,
    marginHorizontal: 10,
  },
  buttonText: {
    fontWeight: "bold",
    color: Colors.secondary,
    fontSize: 32,
    marginTop: 10,
  },
  takeoutImage: {
    width: 180,
    height: 180,
    marginBottom: 5,
  },
  carouselContainer: { marginTop: 40, marginBottom: 10 },
  carouselImage: { width: 150, height: 150, borderRadius: 16, marginRight: 16 },
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
});

import { Colors } from "@/constants/Colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  BackHandler,
  Button,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";

const SQUARE_SIZE = 450;

export default function QrBranchScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => true;

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      return () => subscription.remove();
    }, [])
  );

  React.useEffect(() => {
    if (permission?.status === "denied") {
      setError(
        "Camera access was denied. Please allow camera permission to scan the QR code."
      );
    } else {
      setError(null);
    }
  }, [permission]);

  const handleTryAgain = () => {
    setError(null);
    requestPermission();
    setScanned(false);
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    await AsyncStorage.setItem("BRANCH_ID", data);
    router.replace("/welcome-screen");
  };

  if (!permission) {
    return (
      <View style={styles.centered}>
        <Text>Requesting camera permission…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Try Again" onPress={handleTryAgain} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Image
          source={require("../../assets/images/paik-logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      <View style={styles.centerArea}>
        <View style={styles.cameraBorder}>
          <CameraView
            style={styles.camera}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          />
        </View>
      </View>

      {/* Bottom Text */}
      <View style={styles.bottomTextContainer}>
        <Text style={styles.scanText}>Scan QR Code</Text>
        {scanned && (
          <Button title="Tap to Scan Again" onPress={() => setScanned(false)} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: 24,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: Colors.background,
  },
  errorText: {
    color: "red",
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  logoContainer: {
    alignItems: "center",
    paddingTop: 44,
    paddingBottom: 18,
  },
  logo: {
    width: 200,
    height: 200,
    borderRadius: 30,
  },
  centerArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cameraBorder: {
    borderWidth: 50,
    borderRadius: 20,
    overflow: "hidden",
    borderColor: Colors.secondary,
  },
  camera: {
    width: SQUARE_SIZE,
    height: SQUARE_SIZE,
  },
  bottomTextContainer: {
    alignItems: "center",
    paddingBottom: 42,
  },
  scanText: {
    color: Colors.secondary,
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: 1.2,
    marginBottom: 24,
  },
});

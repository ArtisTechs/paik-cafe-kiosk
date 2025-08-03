import { STORAGE_KEY } from "@/keys";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [hasBranch, setHasBranch] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkBranch = async () => {
      const branchId = await AsyncStorage.getItem(STORAGE_KEY.BRANCH_ID);
      setHasBranch(!!branchId);
      setLoading(false);
    };
    checkBranch();
  }, []);

  useEffect(() => {
    if (!loading && hasBranch !== null) {
      if (hasBranch) {
        // router.replace("/(tabs)/welcome-screen");
        router.replace("/(tabs)/menu-screen");
      } else {
        router.replace("/(tabs)/scan-qr-screen");
      }
    }
  }, [loading, hasBranch]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#12204a" />
      </View>
    );
  }
}

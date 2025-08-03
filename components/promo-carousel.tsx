import React from "react";
import { Dimensions, Image, StyleSheet, View } from "react-native";
import Carousel from "react-native-reanimated-carousel";

const { width } = Dimensions.get("window");

interface PromoCarouselProps {
  images: any[];
  height?: number;
  width?: number;
}

export default function PromoCarousel({
  images,
  height = 300,
  width: propWidth = width * 0.8,
}: PromoCarouselProps) {
  return (
    <View style={[styles.carouselContainer, { height: height + 40 }]}>
      <Carousel
        width={propWidth}
        height={height}
        data={images}
        loop
        autoPlay
        autoPlayInterval={5500}
        scrollAnimationDuration={1000}
        style={{ alignSelf: "center" }}
        mode="parallax"
        modeConfig={{
          parallaxScrollingOffset: 30,
          parallaxScrollingScale: 0.9,
        }}
        renderItem={({ item }) => (
          <Image
            source={item}
            style={[styles.carouselImage, { width: propWidth, height }]}
            resizeMode="cover"
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  carouselContainer: {
    marginTop: 5,
    marginBottom: 5,
    height: 340,
    justifyContent: "center",
    alignItems: "center",
  },
  carouselImage: {
    borderRadius: 16,
  },
});

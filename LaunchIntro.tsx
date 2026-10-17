import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  onFinish: () => void;
};

export default function LaunchIntro({ onFinish }: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.72)).current;
  const titleY = useRef(new Animated.Value(18)).current;
  const bars = useRef(
    Array.from({ length: 7 }, () => new Animated.Value(0.25))
  ).current;

  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        speed: 11,
        bounciness: 7,
        useNativeDriver: true,
      }),
      Animated.timing(titleY, {
        toValue: 0,
        duration: 650,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    const equalizer = bars.map((bar, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, {
            toValue: 1,
            duration: 260 + index * 35,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(bar, {
            toValue: 0.25,
            duration: 260 + index * 35,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      )
    );

    entrance.start();
    Animated.parallel(equalizer).start();

    const finishTimer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onFinish();
      });
    }, 2300);

    return () => {
      clearTimeout(finishTimer);
      entrance.stop();
      bars.forEach(bar => bar.stopAnimation());
      opacity.stopAnimation();
      scale.stopAnimation();
      titleY.stopAnimation();
    };
  }, [opacity, scale, titleY, bars, onFinish]);

  return (
    <Animated.View
      pointerEvents="auto"
      style={[StyleSheet.absoluteFill, styles.overlay, { opacity }]}
    >
      <LinearGradient
        colors={['#080B1A', '#11183A', '#21104B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.background}
      >
        <Animated.View
          style={[
            styles.logoWrap,
            { transform: [{ scale }] },
          ]}
        >
          <Image
            source={require('./assets/icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </Animated.View>

        <Animated.View
          style={{ alignItems: 'center', transform: [{ translateY: titleY }] }}
        >
          <Text style={styles.title}>TROUPER</Text>
          <Text style={styles.subtitle}>PLAYER</Text>
        </Animated.View>

        <View style={styles.equalizer}>
          {bars.map((bar, index) => (
            <Animated.View
              key={index}
              style={[
                styles.bar,
                {
                  transform: [{ scaleY: bar }],
                  opacity: bar,
                },
              ]}
            />
          ))}
        </View>

        <Text style={styles.tagline}>YOUR MUSIC. YOUR WORLD.</Text>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: '#080B1A',
  },
  background: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: {
    width: 178,
    height: 178,
    marginBottom: 25,
    borderRadius: 40,
    overflow: 'hidden',
    shadowColor: '#5275FF',
    shadowOpacity: 0.55,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
    elevation: 18,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 31,
    fontWeight: '900',
    letterSpacing: 6,
  },
  subtitle: {
    color: '#9BAEFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 9,
    marginTop: 5,
  },
  equalizer: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginTop: 40,
  },
  bar: {
    width: 5,
    height: 35,
    borderRadius: 5,
    backgroundColor: '#8EA4FF',
  },
  tagline: {
    position: 'absolute',
    bottom: 55,
    color: '#8790B5',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
  },
});

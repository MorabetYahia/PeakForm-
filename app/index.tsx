import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Animated,
  StatusBar,
  Dimensions,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get("window");

export default function HomeScreen() {
  const navigation = useNavigation();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const buttonFadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [language, setLanguage] = useState("en");

  useEffect(() => {
    navigation.setOptions({ headerShown: false });

    // Staggered animations for a more professional feel
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(buttonFadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Subtle pulsing animation for the signup button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [navigation, fadeAnim, slideAnim, buttonFadeAnim, pulseAnim]);

  const toggleLanguage = () => {
    Haptics.selectionAsync();
    setLanguage((prevLang) => (prevLang === "en" ? "fr" : "en"));
  };

  return (
    <View style={styles.container}>
      <ImageBackground 
        source={require("./pics/bg3.jpg")} 
        style={styles.background}
        imageStyle={{ opacity: 1.0 }}
      >
        {/* Almost imperceptible purple overlay */}
        <View style={styles.purpleOverlay} />
        
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <LinearGradient
          colors={['rgba(10, 10, 20, 0.6)', 'rgba(20, 20, 30, 0.85)']}
          style={styles.overlay}
        >
          <TouchableOpacity style={styles.languageButton} onPress={toggleLanguage}>
            <Ionicons name="globe-outline" size={18} color="#fff" />
            <Text style={styles.languageText}>{language === "en" ? " English" : " Français"}</Text>
          </TouchableOpacity>

          <View style={styles.logoContainer}>
            <Animated.Image
              source={require("./pics/logo.png")}
              style={[
                styles.logo, 
                { 
                  opacity: fadeAnim, 
                  transform: [
                    { translateY: slideAnim },
                    { scale: pulseAnim }
                  ] 
                }
              ]}
            />
          </View>

          <View style={styles.textContainer}>
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              <Text style={styles.title}>
                <Text style={{ color: "#fff" }}>Peak</Text>
                <Text style={{ color: "#b300ff" }}>Form</Text>
              </Text>
              <Text style={styles.subtitle}>
                {language === "en" ? "Reach your peak with ease" : "Atteignez votre sommet avec facilité"}
              </Text>
            </Animated.View>
          </View>

          <Animated.View style={[styles.buttonContainer, { opacity: buttonFadeAnim }]}>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <TouchableOpacity
                style={styles.button}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/signUpScreen');
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#b300ff', '#8000ff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientButton}
                >
                  <Ionicons name="arrow-forward-circle-outline" size={20} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.buttonText}>{language === "en" ? "Sign Up" : "S'inscrire"}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
            
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => {
                Haptics.selectionAsync();
                router.push('/LoginScreen');
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>{language === "en" ? "Log In" : "Se connecter"}</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.footer}>
            <Text style={styles.privacy}>
              {language === "en"
                ? "By continuing, you agree to our "
                : "En continuant, vous acceptez nos "}
              <Text style={styles.link}>{language === "en" ? "Terms of Service" : "Conditions d'utilisation"}</Text>
              {" "}
              {language === "en" ? "and " : "et "}
              <Text style={styles.link}>{language === "en" ? "Privacy Policy" : "Politique de confidentialité"}</Text>.
            </Text>
          </View>
        </LinearGradient>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    resizeMode: "cover",
  },
  purpleOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(128, 0, 128, 0.03)',
    zIndex: 1,
  },
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 25,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 30,
    zIndex: 2,
  },
  languageButton: {
    position: "absolute",
    top: Platform.OS === 'ios' ? 50 : 40,
    right: 25,
    backgroundColor: "rgba(143, 0, 255, 0.4)",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 10,
  },
  languageText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 4,
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: height * 0.08,
    position: "relative",
  },
  logo: {
    width: 170,
    height: 170,
    resizeMode: "contain",
  },
  textContainer: {
    alignItems: "center",
    marginTop: -height * 0.06,
  },
  title: {
    fontSize: 56,
    fontWeight: "bold",
    letterSpacing: 1,
    textAlign: "center",
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: 18,
    color: "#eee",
    textAlign: "center",
    marginTop: 10,
    fontWeight: "400",
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0.5, height: 0.5 },
    textShadowRadius: 1,
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: height * 0.05,
  },
  button: {
    width: width * 0.85,
    borderRadius: 30,
    marginBottom: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  gradientButton: {
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  buttonIcon: {
    marginRight: 10,
  },
  loginButton: {
    width: width * 0.85,
    paddingVertical: 16,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  footer: {
    width: "100%",
    alignItems: "center",
  },
  privacy: {
    fontSize: 13,
    color: "#ddd",
    textAlign: "center",
    paddingHorizontal: 20,
    lineHeight: 18,
  },
  link: {
    color: "#b300ff",
    fontWeight: "bold",
  },
});
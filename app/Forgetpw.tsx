import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import * as Haptics from 'expo-haptics';

export default function Forgetpw() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(50))[0];
  
  useEffect(() => {
    // Start animations when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleResetPassword = async () => {
    // Add haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (!code || !newPassword || !confirmPassword) {
      setError("All fields are required!");
      return;
    }
    
    if (code.length !== 6) {
      setError("Verification code must be 6 digits");
      return;
    }
    
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }
    
    setError("");
    setIsLoading(true);
    
    try {
      // Simulate API call with timeout
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log("Reset Password Submitted:", { code, newPassword });
      // Mock successful password reset
      router.push('/LoginScreen');
    } catch (err) {
      setError("Password reset failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ImageBackground source={require("./pics/bg3.jpg")} style={styles.background}>
        <LinearGradient
          colors={['rgba(10, 10, 20, 0.6)', 'rgba(20, 20, 30, 0.85)']}
          style={styles.gradient}
        >
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={styles.formContainer}
            >
              <Animated.View style={[
                styles.headerContainer, 
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
              ]}>
                <Text style={styles.title}>
                  <Text style={{ color: "#fff" }}>Reset </Text>
                  <Text style={{ color: "#b300ff" }}>Password</Text>
                </Text>
              </Animated.View>

              {error ? (
                <Animated.View style={[styles.errorContainer, { opacity: fadeAnim }]}>
                  <Ionicons name="alert-circle" size={18} color="#FF4D4D" />
                  <Text style={styles.errorText}>{error}</Text>
                </Animated.View>
              ) : null}

              <Animated.View style={[
                styles.inputsContainer, 
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
              ]}>
                <View style={styles.inputContainer}>
                  <Ionicons name="key-outline" size={22} color="#ddd" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Verification Code"
                    placeholderTextColor="#aaa"
                    keyboardType="numeric"
                    maxLength={6}
                    value={code}
                    onChangeText={setCode}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={22} color="#ddd" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="New Password"
                    placeholderTextColor="#aaa"
                    secureTextEntry={!showNewPassword}
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setShowNewPassword((prev) => !prev);
                    }}
                  >
                    <Ionicons
                      name={showNewPassword ? "eye-off" : "eye"}
                      size={22}
                      color="#ddd"
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={22} color="#ddd" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm Password"
                    placeholderTextColor="#aaa"
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeIcon}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setShowConfirmPassword((prev) => !prev);
                    }}
                  >
                    <Ionicons
                      name={showConfirmPassword ? "eye-off" : "eye"}
                      size={22}
                      color="#ddd"
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  onPress={handleResetPassword} 
                  activeOpacity={0.7} 
                  style={styles.buttonContainer}
                  disabled={isLoading}
                >
                  <LinearGradient 
                    colors={["#b300ff", "#8000ff"]} 
                    start={{ x: 0, y: 0 }} 
                    end={{ x: 1, y: 1 }} 
                    style={styles.resetButton}
                  >
                    {isLoading ? (
                      <View style={styles.loadingContainer}>
                        <Text style={styles.resetText}>Resetting</Text>
                        <View style={styles.loadingDots}>
                          <View style={[styles.loadingDot, styles.dot1]} />
                          <View style={[styles.loadingDot, styles.dot2]} />
                          <View style={[styles.loadingDot, styles.dot3]} />
                        </View>
                      </View>
                    ) : (
                      <Text style={styles.resetText}>Reset Password</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              <Animated.View style={[
                styles.footerContainer, 
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
              ]}>
                <TouchableOpacity 
                  onPress={() => {
                    Haptics.selectionAsync();
                    console.log("Resend email clicked");
                  }} 
                  style={styles.resendContainer}
                >
                  <Text style={styles.footerText}>
                    Didn't receive the code? <Text style={styles.resendText}>Resend Email</Text>
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => {
                    Haptics.selectionAsync(); 
                    router.push('/LoginScreen');
                  }} 
                  style={styles.backToLoginContainer}
                >
                  <Text style={styles.footerText}>
                    <Text style={styles.backToLoginText}>Back to Login</Text>
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </KeyboardAvoidingView>
          </ScrollView>
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
    width: "100%",
    height: "100%",
  },
  gradient: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  formContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 20,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 10,
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 77, 77, 0.1)",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginBottom: 18,
    width: "85%",
    borderWidth: 1,
    borderColor: "rgba(255, 77, 77, 0.3)",
  },
  errorText: {
    color: "#FF4D4D",
    fontSize: 14,
    marginLeft: 8,
  },
  inputsContainer: {
    width: "100%",
    alignItems: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    width: "85%",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#fff",
    paddingVertical: 4,
  },
  eyeIcon: {
    padding: 5,
  },
  buttonContainer: {
    width: "85%",
    marginTop: 12,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 8,
    shadowColor: "#b300ff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  resetButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  resetText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingDots: {
    flexDirection: "row",
    marginLeft: 8,
  },
  loadingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#fff",
    marginHorizontal: 2,
    opacity: 0.7,
  },
  dot1: {
    animationName: "bounce",
    animationDuration: "0.6s",
    animationIterationCount: "infinite",
  },
  dot2: {
    animationName: "bounce",
    animationDuration: "0.6s",
    animationDelay: "0.2s",
    animationIterationCount: "infinite",
  },
  dot3: {
    animationName: "bounce",
    animationDuration: "0.6s",
    animationDelay: "0.4s",
    animationIterationCount: "infinite",
  },
  footerContainer: {
    alignItems: "center",
    marginTop: 30,
  },
  resendContainer: {
    marginBottom: 12,
  },
  backToLoginContainer: {
    marginTop: 5,
  },
  footerText: {
    color: "#ddd",
    fontSize: 16,
  },
  resendText: {
    color: "#b300ff",
    fontSize: 16,
    fontWeight: "600",
  },
  backToLoginText: {
    color: "#b300ff",
    fontSize: 16,
    fontWeight: "600",
  },
});
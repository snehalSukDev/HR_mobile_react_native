// App.js
import React from "react";
import AppContainer from "./src/navigation/AppContainer";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ErrorBoundary from "./src/Components/ErrorBoundary";
import { ThemeProvider } from "./src/context/ThemeContext";
import Toast from "react-native-toast-message";

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <AppContainer />
          <Toast />
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

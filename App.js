// App.js
import React from "react";
import AppContainer from "./src/navigation/AppContainer";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ErrorBoundary from "./src/Components/ErrorBoundary";

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AppContainer />
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

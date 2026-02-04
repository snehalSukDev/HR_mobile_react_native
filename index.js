import "react-native-gesture-handler";
import { registerRootComponent } from "expo";
import { LogBox } from "react-native";

// Prevent auto-closing in some cases by logging errors
if (global.ErrorUtils) {
  const originalHandler = global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    // console.error("Global Error Handler:", error, isFatal);
    // Prevent default crash behavior for non-fatal errors
    if (!isFatal) {
      return;
    }
    // For fatal errors, we might still want to let it crash or try to recover
    // But usually we can't recover from fatal JS errors easily without native restart
    originalHandler(error, isFatal);
  });
}

// Ignore common unnecessary warnings
LogBox.ignoreLogs([
  "Require cycle:",
  "Non-serializable values were found in the navigation state",
]);

import App from "./App";

registerRootComponent(App);

import "@expo/metro-runtime";
import { registerRootComponent } from "expo";
import App from "./App";
import { registerBackgroundHandler } from "./src/notifications";
registerBackgroundHandler();
registerRootComponent(App);

import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { api } from "../../lib/api";

const TOKEN_KEY = "pb.pushToken";

/**
 * Tells the server which phone this person carries. Needs the EAS project id (app.json
 * extra.eas.projectId, written by `eas init`); without it Expo cannot mint a token and the
 * app keeps working on local reminders alone.
 */
export async function registerPushToken(): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      if (__DEV__) console.log("push: no EAS projectId in app.json, skipping token registration");
      return;
    }
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await api.me.registerPushToken({ token, platform: Platform.OS === "ios" ? "ios" : "android" });
    await AsyncStorage.setItem(TOKEN_KEY, token);
  } catch (e) {
    // No APNs entitlement (personal Apple team) or no network: local reminders still work, just no server push.
    if (__DEV__) console.log("push: token registration skipped", String(e));
  }
}

/** Before sign-out, while the session cookie still works. */
export async function unregisterPushToken(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    if (!token) return;
    await AsyncStorage.removeItem(TOKEN_KEY);
    await api.me.removePushToken(token);
  } catch {
    // offline sign-out: the server drops the token on its first DeviceNotRegistered anyway
  }
}

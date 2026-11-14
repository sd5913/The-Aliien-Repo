// User settings are kept on the local device for this stage.
// 用户设置本期不落 Supabase，按设备存在浏览器本地。
import { readLocalJson, writeLocalJson } from "../../../lib/storage/localStorage";

export interface UserSettings {
  nickname: string;
  email: string;
  avatar: string;
  cameraEnabled: boolean;
  photosEnabled: boolean;
  showNickname: boolean;
}

export const defaultUserSettings: UserSettings = {
  nickname: "小云朵",
  email: "hello@bothpls.app",
  avatar: "🌷",
  cameraEnabled: false,
  photosEnabled: true,
  showNickname: true,
};

const SETTINGS_KEY = "bothpls:settings:v1";

function isUserSettings(value: unknown): value is UserSettings {
  return Boolean(value && typeof value === "object" &&
    "nickname" in value && typeof value.nickname === "string" &&
    "email" in value && typeof value.email === "string" &&
    "avatar" in value && typeof value.avatar === "string" &&
    "cameraEnabled" in value && typeof value.cameraEnabled === "boolean" &&
    "photosEnabled" in value && typeof value.photosEnabled === "boolean" &&
    "showNickname" in value && typeof value.showNickname === "boolean");
}

export async function fetchUserSettings(_userId: string): Promise<UserSettings> {
  return readLocalJson(SETTINGS_KEY, defaultUserSettings, isUserSettings);
}

export async function saveUserSettings(
  _userId: string,
  settings: UserSettings,
): Promise<void> {
  writeLocalJson(SETTINGS_KEY, settings);
}

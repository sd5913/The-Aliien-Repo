export const USER_SETTINGS_STORAGE_KEY = "bothpls:settings:v1";

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

function isUserSettings(value: unknown): value is UserSettings {
  return Boolean(value && typeof value === "object" &&
    "nickname" in value && typeof value.nickname === "string" &&
    "email" in value && typeof value.email === "string" &&
    "avatar" in value && typeof value.avatar === "string" &&
    "cameraEnabled" in value && typeof value.cameraEnabled === "boolean" &&
    "photosEnabled" in value && typeof value.photosEnabled === "boolean" &&
    "showNickname" in value && typeof value.showNickname === "boolean");
}

export function readUserSettings(): UserSettings {
  try {
    const raw = window.localStorage.getItem(USER_SETTINGS_STORAGE_KEY);
    if (!raw) return defaultUserSettings;
    const parsed: unknown = JSON.parse(raw);
    if (isUserSettings(parsed)) return parsed;
    console.error("BothPls: stored user settings have an invalid shape.");
  } catch (error) {
    console.error("BothPls: could not read user settings.", error);
  }
  return defaultUserSettings;
}

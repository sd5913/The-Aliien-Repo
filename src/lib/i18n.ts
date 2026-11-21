export type BothPlsLocale = "zh-CN" | "en-US";

export const LOCALE_STORAGE_KEY = "bothpls:locale";

const zh = {
  "settings.title": "设置",
  "settings.account": "账号",
  "settings.profile": "个人资料",
  "settings.binding": "账号绑定",
  "settings.binding.current": "已绑定",
  "settings.binding.upgrade": "升级为正式账号",
  "settings.privacy": "隐私与账号",
  "settings.deleteAccount": "注销账号",
  "settings.clearLocal": "清除本地数据",
  "settings.general": "通用",
  "settings.language": "语言",
  "settings.notifications": "通知权限",
  "settings.about": "关于",
  "settings.version": "当前版本",
  "settings.changelog": "更新日志",
  "settings.logout": "退出登录",
  "settings.login": "登录",
  "settings.cancel": "取消",
  "settings.confirm": "确认",
  "settings.clearConfirm": "确认清除本地数据？",
  "settings.deleteConfirm": "输入昵称以确认注销账号",
  "settings.avatarUploadFailed": "头像上传失败，请重试。",
  "settings.loadFailed": "加载失败，请稍后重试。",
  "common.retry": "重试",
} as const;

const en: Record<keyof typeof zh, string> = {
  "settings.title": "Settings",
  "settings.account": "Account",
  "settings.profile": "Profile",
  "settings.binding": "Account binding",
  "settings.binding.current": "Linked",
  "settings.binding.upgrade": "Upgrade to account",
  "settings.privacy": "Privacy and account",
  "settings.deleteAccount": "Delete account",
  "settings.clearLocal": "Clear local data",
  "settings.general": "General",
  "settings.language": "Language",
  "settings.notifications": "Notification permission",
  "settings.about": "About",
  "settings.version": "Current version",
  "settings.changelog": "Changelog",
  "settings.logout": "Log out",
  "settings.login": "Log in",
  "settings.cancel": "Cancel",
  "settings.confirm": "Confirm",
  "settings.clearConfirm": "Clear local data?",
  "settings.deleteConfirm": "Enter your nickname to confirm account deletion",
  "settings.avatarUploadFailed": "Avatar upload failed. Please retry.",
  "settings.loadFailed": "Loading failed. Please retry.",
  "common.retry": "Retry",
};

export function getLocale(): BothPlsLocale {
  const value = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return value === "en-US" ? "en-US" : "zh-CN";
}

export function setLocale(locale: BothPlsLocale) {
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  window.location.reload();
}

export function t(key: keyof typeof zh): string {
  const locale = getLocale();
  if (locale === "en-US") return en[key] ?? zh[key];
  return zh[key] ?? key;
}

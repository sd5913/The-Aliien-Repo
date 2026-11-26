import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "org.sd5913.bothpls",
  appName: "BothPls",
  webDir: "dist-ios",
  // Capacitor debug logs include plugin results. Apple results carry credentials.
  loggingBehavior: "none",
};

export default config;

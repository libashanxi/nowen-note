import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.nowen.note",
  appName: "Nowen Note",
  webDir: "dist",
  server: {
    // 允许 HTTP 明文（连接局域网 IP 需要）
    cleartext: true,
    // 不使用内置服务器的 origin，让 fetch 使用绝对 URL
    androidScheme: "http",
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;

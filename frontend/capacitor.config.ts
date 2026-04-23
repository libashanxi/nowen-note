import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.nowen.note",
  appName: "Nowen Note",
  webDir: "dist",
  server: {
    // 允许 HTTP 明文（连接局域网 IP / HTTP 服务器需要）
    cleartext: true,
    // androidScheme 保持默认 "https"（不显式指定）：
    //   1) 默认 origin 为 https://localhost，符合浏览器现代安全模型，
    //      avoids Service Worker / fetch / cookie 在 http origin 下被额外限制；
    //   2) 配合 allowMixedContent:true + cleartext:true，仍然可以从 https 页面
    //      调 http://192.168.x.x:3001 这种局域网后端；
    //   3) 切勿改回 "http" —— 改 scheme 会切换 WebView 的 origin，导致旧版本
    //      localStorage（含登录 token / 服务器地址）全部丢失，升级后表现为
    //      "登录后重启白屏"。
  },
  android: {
    // 允许 https origin 的页面加载 / 请求 http 资源（连内网 HTTP 后端需要）
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      // 禁用自动隐藏，由前端 JS 在渲染完成后手动调用 hide()
      launchAutoHide: false,
      // 背景色与深色主题一致，减少视觉跳变
      backgroundColor: "#0d1117",
      // 使用现有 splash.png
      launchShowDuration: 0,
      showSpinner: false,
    },
    StatusBar: {
      // 默认深色模式状态栏（后续由 JS 动态切换）
      style: "DARK",
      backgroundColor: "#0d1117",
    },
    Keyboard: {
      // 键盘弹出时不自动调整 WebView 大小，由前端 JS 手动控制布局
      resize: "none",
      // 点击 WebView 空白区域时自动收起键盘
      resizeOnFullScreen: true,
    },
  },
};

export default config;

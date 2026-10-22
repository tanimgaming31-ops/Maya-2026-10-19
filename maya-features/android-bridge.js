export const AndroidBridge = {
  available() {
    return typeof window !== "undefined" && !!window.Capacitor;
  },
  async runAction(action, payload = {}) {
    if (!this.available()) {
      return { status: "unavailable", message: "Android native bridge is not available in browser." };
    }
    return { status: "ready", action, payload };
  }
};

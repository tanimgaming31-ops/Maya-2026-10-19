/* Maya V18 genuine, capability-limited Android bridge.
   Never report success before the existing native MayaBridge returns it.
   No message sending, calling, unlocking, or hidden automation is exposed here. */
const ALLOWED = new Set(['V9_GET', 'V8_DEVICE_INFO', 'V8_WIFI', 'V8_BLUETOOTH',
  'V8_INTERNET', 'V8_NFC', 'V8_HOTSPOT', 'V8_LOCATION', 'V8_DISPLAY']);
export const AndroidBridge = {
  available() {
    return typeof window !== 'undefined' && typeof window.MayaBridge?.control === 'function';
  },
  async runAction(action, payload = {}) {
    if (!ALLOWED.has(action)) return {status:'rejected',message:'This action is not allowed by the V18 safety bridge.'};
    if (!this.available()) return {status:'unavailable',message:'Real Maya native bridge is not connected. Browser mode cannot control Android.'};
    try {
      const raw=window.MayaBridge.control(action,JSON.stringify(payload||{}));
      const result=typeof raw==='string'?JSON.parse(raw):raw;
      if(!result||typeof result.status!=='string')return {status:'error',message:'Native bridge returned an invalid response.'};
      return result;
    } catch(error) {
      return {status:'error',message:'Native call failed: '+String(error?.message||error)};
    }
  }
};
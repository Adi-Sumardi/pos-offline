// Polyfill WeakRef & FinalizationRegistry for Hermes engine
// Must run BEFORE any other import (Drizzle ORM requires these)
if (typeof (globalThis as any).WeakRef === 'undefined') {
  (globalThis as any).WeakRef = class WeakRef {
    private _value: any;
    constructor(value: any) { this._value = value; }
    deref() { return this._value; }
  };
}
if (typeof (globalThis as any).FinalizationRegistry === 'undefined') {
  (globalThis as any).FinalizationRegistry = class FinalizationRegistry {
    constructor(_callback: any) {}
    register() {}
    unregister() {}
  };
}

// Now load Expo Router entry
import 'expo-router/entry';

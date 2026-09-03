import {
  DATABASE_NAME,
  DATABASE_PROJECT_KEY,
  DATABASE_STORE,
  DATABASE_VERSION,
  STORAGE_KEY,
} from "./config.js";

const LEGACY_STORAGE_KEY = "math-1280-whiteboard-v1";
const LEGACY_DATABASE_NAME = "math-1280-whiteboard";

export function createProjectStorage() {
  const databasePromises = new Map();
  let useLocalStorageFallback = false;
  let legacyDatabaseUsed = false;

  function openDatabase(databaseName = DATABASE_NAME) {
    if (!globalThis.indexedDB) return Promise.reject(new Error("IndexedDB is unavailable"));
    if (databasePromises.has(databaseName)) return databasePromises.get(databaseName);
    const databasePromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, DATABASE_VERSION);
      request.addEventListener("upgradeneeded", () => {
        if (!request.result.objectStoreNames.contains(DATABASE_STORE)) request.result.createObjectStore(DATABASE_STORE);
      });
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => reject(request.error));
      request.addEventListener("blocked", () => reject(new Error("MathBoard database is blocked")));
    });
    databasePromises.set(databaseName, databasePromise);
    return databasePromise;
  }

  async function readFromDatabase(databaseName = DATABASE_NAME) {
    const database = await openDatabase(databaseName);
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(DATABASE_STORE, "readonly");
      const request = transaction.objectStore(DATABASE_STORE).get(DATABASE_PROJECT_KEY);
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => reject(request.error));
    });
  }

  async function writeToDatabase(savedState) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(DATABASE_STORE, "readwrite");
      transaction.objectStore(DATABASE_STORE).put({
        version: 2,
        savedAt: new Date().toISOString(),
        state: savedState,
      }, DATABASE_PROJECT_KEY);
      transaction.addEventListener("complete", resolve);
      transaction.addEventListener("error", () => reject(transaction.error));
      transaction.addEventListener("abort", () => reject(transaction.error || new Error("Save aborted")));
    });
  }

  async function load() {
    let saved = null;
    let needsMigration = false;
    try {
      const record = await readFromDatabase();
      saved = record?.state || null;
    } catch {
      useLocalStorageFallback = true;
    }
    if (!saved && !useLocalStorageFallback) {
      try {
        const record = await readFromDatabase(LEGACY_DATABASE_NAME);
        saved = record?.state || null;
        legacyDatabaseUsed = Boolean(saved);
        needsMigration = legacyDatabaseUsed;
      } catch {
        // A missing legacy database should not prevent current storage from working.
      }
    }
    if (!saved) {
      try {
        saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        needsMigration = Boolean(saved);
      } catch {
        saved = null;
      }
    }
    if (!saved) {
      try {
        saved = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
        needsMigration = Boolean(saved);
      } catch {
        saved = null;
      }
    }
    return { saved, needsMigration };
  }

  async function save(savedState) {
    if (!useLocalStorageFallback) {
      try {
        await writeToDatabase(savedState);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        return "indexed-db";
      } catch {
        useLocalStorageFallback = true;
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedState));
    return "local-storage";
  }

  async function clear() {
    try {
      if (!useLocalStorageFallback) {
        const names = legacyDatabaseUsed ? [DATABASE_NAME, LEGACY_DATABASE_NAME] : [DATABASE_NAME];
        await Promise.all(names.map(async (databaseName) => {
          const database = await openDatabase(databaseName);
          await new Promise((resolve, reject) => {
            const transaction = database.transaction(DATABASE_STORE, "readwrite");
            transaction.objectStore(DATABASE_STORE).delete(DATABASE_PROJECT_KEY);
            transaction.addEventListener("complete", resolve);
            transaction.addEventListener("error", () => reject(transaction.error));
            transaction.addEventListener("abort", () => reject(transaction.error || new Error("Delete aborted")));
          });
        }));
      }
    } finally {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  }

  return {
    clear,
    get isFallback() {
      return useLocalStorageFallback;
    },
    load,
    save,
  };
}

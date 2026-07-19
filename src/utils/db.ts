import { PhotoRecord } from "../types";

const DB_NAME = "ArchivistPhotoCatalogDB";
const STORE_NAME = "photo_records";
const DB_VERSION = 1;

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error("Failed to open IndexedDB"));
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export async function getAllRecords(): Promise<PhotoRecord[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(new Error("Failed to fetch records from IndexedDB"));
      };
    });
  } catch (error) {
    console.warn("IndexedDB not available, falling back to empty list:", error);
    return [];
  }
}

export async function saveRecordToDB(record: PhotoRecord): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(record);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error("Failed to save record to IndexedDB"));
      };
    });
  } catch (error) {
    console.error("IndexedDB write failed:", error);
    throw error;
  }
}

export async function saveAllRecordsToDB(records: PhotoRecord[]): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      
      // Clear all first to sync with state
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        if (records.length === 0) {
          resolve();
          return;
        }
        
        let completed = 0;
        let hasError = false;

        records.forEach((record) => {
          const request = store.put(record);
          request.onsuccess = () => {
            completed++;
            if (completed === records.length && !hasError) {
              resolve();
            }
          };
          request.onerror = () => {
            if (!hasError) {
              hasError = true;
              reject(new Error("Failed to save all records to IndexedDB"));
            }
          };
        });
      };

      clearRequest.onerror = () => {
        reject(new Error("Failed to clear store for sync in IndexedDB"));
      };
    });
  } catch (error) {
    console.error("IndexedDB write failed:", error);
    throw error;
  }
}

export async function deleteRecordFromDB(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error("Failed to delete record from IndexedDB"));
      };
    });
  } catch (error) {
    console.error("IndexedDB delete failed:", error);
    throw error;
  }
}

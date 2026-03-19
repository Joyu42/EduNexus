// 协作数据存储（基于 IndexedDB）
import { openDB, type IDBPDatabase } from "idb";
import type {
  CollabSession,
  CollabMessage,
  CollabVersion,
  CollabOperation,
} from "./collab-types";

const DB_NAME = "edunexus-collab";
const DB_VERSION = 1;

type CollabDB = {
  sessions: {
    key: string;
    value: CollabSession;
    indexes: { "by-owner": string; "by-updated": string };
  };
  messages: {
    key: string;
    value: CollabMessage;
    indexes: { "by-session": string; "by-created": string };
  };
  versions: {
    key: string;
    value: CollabVersion;
    indexes: { "by-session": string; "by-created": string };
  };
  operations: {
    key: string;
    value: CollabOperation;
    indexes: { "by-user": string; "by-timestamp": string };
  };
};

let dbInstance: IDBPDatabase<CollabDB> | null = null;

async function getDB(): Promise<IDBPDatabase<CollabDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<CollabDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Sessions store
      if (!db.objectStoreNames.contains("sessions")) {
        const sessionStore = db.createObjectStore("sessions", { keyPath: "id" });
        sessionStore.createIndex("by-owner", "ownerId");
        sessionStore.createIndex("by-updated", "updatedAt");
      }

      // Messages store
      if (!db.objectStoreNames.contains("messages")) {
        const messageStore = db.createObjectStore("messages", { keyPath: "id" });
        messageStore.createIndex("by-session", "sessionId");
        messageStore.createIndex("by-created", "createdAt");
      }

      // Versions store
      if (!db.objectStoreNames.contains("versions")) {
        const versionStore = db.createObjectStore("versions", { keyPath: "id" });
        versionStore.createIndex("by-session", "sessionId");
        versionStore.createIndex("by-created", "createdAt");
      }

      // Operations store
      if (!db.objectStoreNames.contains("operations")) {
        const operationStore = db.createObjectStore("operations", {
          keyPath: "timestamp",
        });
        operationStore.createIndex("by-user", "userId");
        operationStore.createIndex("by-timestamp", "timestamp");
      }
    },
  });

  return dbInstance;
}

// Session operations
export async function saveSession(session: CollabSession): Promise<void> {
  const db = await getDB();
  await db.put("sessions", session);
}

export async function getSession(id: string): Promise<CollabSession | undefined> {
  const db = await getDB();
  return db.get("sessions", id);
}

export async function getAllSessions(): Promise<CollabSession[]> {
  const db = await getDB();
  return db.getAll("sessions");
}

export async function getSessionsByOwner(ownerId: string): Promise<CollabSession[]> {
  const db = await getDB();
  return db.getAllFromIndex("sessions", "by-owner", ownerId);
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("sessions", id);
}

// Message operations
export async function saveMessage(message: CollabMessage): Promise<void> {
  const db = await getDB();
  await db.put("messages", message);
}

export async function getMessagesBySession(
  sessionId: string
): Promise<CollabMessage[]> {
  const db = await getDB();
  return db.getAllFromIndex("messages", "by-session", sessionId);
}

export async function deleteMessagesBySession(sessionId: string): Promise<void> {
  const db = await getDB();
  const messages = await getMessagesBySession(sessionId);
  const tx = db.transaction("messages", "readwrite");
  await Promise.all(messages.map((msg) => tx.store.delete(msg.id)));
  await tx.done;
}

// Version operations
export async function saveVersion(version: CollabVersion): Promise<void> {
  const db = await getDB();
  await db.put("versions", version);
}

export async function getVersionsBySession(
  sessionId: string
): Promise<CollabVersion[]> {
  const db = await getDB();
  const versions = await db.getAllFromIndex("versions", "by-session", sessionId);
  return versions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getVersion(id: string): Promise<CollabVersion | undefined> {
  const db = await getDB();
  return db.get("versions", id);
}

export async function deleteVersionsBySession(sessionId: string): Promise<void> {
  const db = await getDB();
  const versions = await getVersionsBySession(sessionId);
  const tx = db.transaction("versions", "readwrite");
  await Promise.all(versions.map((ver) => tx.store.delete(ver.id)));
  await tx.done;
}

// Operation operations
export async function saveOperation(operation: CollabOperation): Promise<void> {
  const db = await getDB();
  await db.put("operations", operation);
}

export async function getOperationsByUser(
  userId: string
): Promise<CollabOperation[]> {
  const db = await getDB();
  return db.getAllFromIndex("operations", "by-user", userId);
}

export async function clearOldOperations(beforeTimestamp: string): Promise<void> {
  const db = await getDB();
  const allOps = await db.getAll("operations");
  const tx = db.transaction("operations", "readwrite");
  await Promise.all(
    allOps
      .filter((op) => op.timestamp < beforeTimestamp)
      .map((op) => tx.store.delete(op.timestamp))
  );
  await tx.done;
}

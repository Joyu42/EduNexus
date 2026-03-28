export type ClientUserSnapshot = {
  id?: string;
  email?: string;
  isDemo?: boolean;
};

const CURRENT_USER_STORAGE_KEY = "edunexus_current_user";

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function normalizeClientUserSnapshot(
  snapshot: ClientUserSnapshot | null
): ClientUserSnapshot | null {
  if (!snapshot || typeof snapshot !== "object") {
    return null;
  }

  return {
    id: typeof snapshot.id === "string" ? snapshot.id : undefined,
    email: typeof snapshot.email === "string" ? snapshot.email : undefined,
    isDemo: snapshot.isDemo === true,
  };
}

export function readClientUserSnapshot(): ClientUserSnapshot | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  const value = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as ClientUserSnapshot | null;
    const snapshot = normalizeClientUserSnapshot(parsed);
    if (!snapshot || (!snapshot.id && !snapshot.email)) {
      localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
      return null;
    }

    return snapshot;
  } catch {
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    return null;
  }
}

export function getClientUserIdentity(): string | null {
  const snapshot = readClientUserSnapshot();
  return snapshot?.id || snapshot?.email || null;
}

export function writeClientUserSnapshot(user: ClientUserSnapshot | null): void {
  if (!canUseLocalStorage()) {
    return;
  }

  if (!user) {
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    return;
  }

  const snapshot = normalizeClientUserSnapshot(user);
  if (!snapshot || (!snapshot.id && !snapshot.email)) {
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    return;
  }

  localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(snapshot));
}

export function clearClientUserSnapshot(): void {
  writeClientUserSnapshot(null);
}

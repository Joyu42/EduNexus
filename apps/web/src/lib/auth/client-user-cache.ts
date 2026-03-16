export type ClientUserSnapshot = {
  id?: string;
  email?: string;
};

const CURRENT_USER_STORAGE_KEY = "edunexus_current_user";

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
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
    if (!parsed || typeof parsed !== "object") {
      localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
      return null;
    }

    return parsed;
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

  localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearClientUserSnapshot(): void {
  writeClientUserSnapshot(null);
}

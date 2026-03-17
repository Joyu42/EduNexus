import {
  loadDb,
  saveDb,
  type PublicResourceRecord,
  type ResourceBookmarkRecord,
  type ResourceFolderRecord,
  type ResourceNoteRecord,
  type ResourceRatingRecord
} from "./store";

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function listResources() {
  const db = await loadDb();
  return db.publicResources.slice();
}

export async function createResource(input: {
  title: string;
  description?: string;
  url?: string;
  createdBy: string;
}) {
  const db = await loadDb();
  const record: PublicResourceRecord = {
    id: createId("resource"),
    title: input.title,
    description: input.description ?? "",
    url: input.url ?? "",
    createdBy: input.createdBy,
    createdAt: new Date().toISOString()
  };

  db.publicResources.unshift(record);
  await saveDb(db);
  return record;
}

export async function updateResource(
  resourceId: string,
  input: Partial<Pick<PublicResourceRecord, "title" | "description" | "url">>
) {
  const db = await loadDb();
  const record = db.publicResources.find((item) => item.id === resourceId);
  if (!record) {
    return null;
  }

  if (typeof input.title === "string") {
    record.title = input.title;
  }
  if (typeof input.description === "string") {
    record.description = input.description;
  }
  if (typeof input.url === "string") {
    record.url = input.url;
  }

  await saveDb(db);
  return record;
}

export async function deleteResource(resourceId: string) {
  const db = await loadDb();
  const before = db.publicResources.length;
  db.publicResources = db.publicResources.filter((item) => item.id !== resourceId);
  if (db.publicResources.length === before) {
    return false;
  }

  await saveDb(db);
  return true;
}

export async function listResourceBookmarks(userId?: string, resourceId?: string) {
  const db = await loadDb();
  return db.resourceBookmarks.filter((bookmark) => {
    if (userId && bookmark.userId !== userId) return false;
    if (resourceId && bookmark.resourceId !== resourceId) return false;
    return true;
  });
}

export async function createResourceBookmark(input: {
  userId: string;
  resourceId: string;
}) {
  const db = await loadDb();
  const record: ResourceBookmarkRecord = {
    id: createId("resource_bookmark"),
    userId: input.userId,
    resourceId: input.resourceId,
    createdAt: new Date().toISOString()
  };

  db.resourceBookmarks.unshift(record);
  await saveDb(db);
  return record;
}

export async function deleteResourceBookmark(bookmarkId: string) {
  const db = await loadDb();
  const before = db.resourceBookmarks.length;
  db.resourceBookmarks = db.resourceBookmarks.filter((item) => item.id !== bookmarkId);
  if (db.resourceBookmarks.length === before) {
    return false;
  }

  await saveDb(db);
  return true;
}

export async function listResourceFolders(userId?: string) {
  const db = await loadDb();
  return userId ? db.resourceFolders.filter((folder) => folder.userId === userId) : db.resourceFolders.slice();
}

export async function createResourceFolder(input: {
  userId: string;
  name: string;
  description?: string;
  resourceIds?: string[];
}) {
  const db = await loadDb();
  const now = new Date().toISOString();
  const record: ResourceFolderRecord = {
    id: createId("resource_folder"),
    userId: input.userId,
    name: input.name,
    description: input.description ?? "",
    resourceIds: input.resourceIds?.filter(Boolean) ?? [],
    createdAt: now,
    updatedAt: now
  };

  db.resourceFolders.unshift(record);
  await saveDb(db);
  return record;
}

export async function updateResourceFolder(
  folderId: string,
  input: Partial<Pick<ResourceFolderRecord, "name" | "description" | "resourceIds">>
) {
  const db = await loadDb();
  const record = db.resourceFolders.find((item) => item.id === folderId);
  if (!record) {
    return null;
  }

  if (typeof input.name === "string") {
    record.name = input.name;
  }
  if (typeof input.description === "string") {
    record.description = input.description;
  }
  if (Array.isArray(input.resourceIds)) {
    record.resourceIds = input.resourceIds.filter(Boolean);
  }
  record.updatedAt = new Date().toISOString();

  await saveDb(db);
  return record;
}

export async function deleteResourceFolder(folderId: string) {
  const db = await loadDb();
  const before = db.resourceFolders.length;
  db.resourceFolders = db.resourceFolders.filter((item) => item.id !== folderId);
  if (db.resourceFolders.length === before) {
    return false;
  }

  await saveDb(db);
  return true;
}

export async function listResourceNotes(userId?: string, resourceId?: string) {
  const db = await loadDb();
  return db.resourceNotes.filter((note) => {
    if (userId && note.userId !== userId) return false;
    if (resourceId && note.resourceId !== resourceId) return false;
    return true;
  });
}

export async function createResourceNote(input: {
  userId: string;
  resourceId: string;
  content: string;
}) {
  const db = await loadDb();
  const now = new Date().toISOString();
  const record: ResourceNoteRecord = {
    id: createId("resource_note"),
    userId: input.userId,
    resourceId: input.resourceId,
    content: input.content,
    createdAt: now,
    updatedAt: now
  };

  db.resourceNotes.unshift(record);
  await saveDb(db);
  return record;
}

export async function updateResourceNote(noteId: string, input: Pick<ResourceNoteRecord, "content">) {
  const db = await loadDb();
  const record = db.resourceNotes.find((item) => item.id === noteId);
  if (!record) {
    return null;
  }

  record.content = input.content;
  record.updatedAt = new Date().toISOString();
  await saveDb(db);
  return record;
}

export async function deleteResourceNote(noteId: string) {
  const db = await loadDb();
  const before = db.resourceNotes.length;
  db.resourceNotes = db.resourceNotes.filter((item) => item.id !== noteId);
  if (db.resourceNotes.length === before) {
    return false;
  }

  await saveDb(db);
  return true;
}

export async function listResourceRatings(userId?: string, resourceId?: string) {
  const db = await loadDb();
  return db.resourceRatings.filter((rating) => {
    if (userId && rating.userId !== userId) return false;
    if (resourceId && rating.resourceId !== resourceId) return false;
    return true;
  });
}

export async function createResourceRating(input: {
  userId: string;
  resourceId: string;
  rating: number;
}) {
  const db = await loadDb();
  const now = new Date().toISOString();
  const record: ResourceRatingRecord = {
    id: createId("resource_rating"),
    userId: input.userId,
    resourceId: input.resourceId,
    rating: Math.max(1, Math.min(5, Math.round(input.rating))),
    createdAt: now,
    updatedAt: now
  };

  db.resourceRatings.unshift(record);
  await saveDb(db);
  return record;
}

export async function updateResourceRating(
  ratingId: string,
  input: Pick<ResourceRatingRecord, "rating">
) {
  const db = await loadDb();
  const record = db.resourceRatings.find((item) => item.id === ratingId);
  if (!record) {
    return null;
  }

  record.rating = Math.max(1, Math.min(5, Math.round(input.rating)));
  record.updatedAt = new Date().toISOString();
  await saveDb(db);
  return record;
}

export async function deleteResourceRating(ratingId: string) {
  const db = await loadDb();
  const before = db.resourceRatings.length;
  db.resourceRatings = db.resourceRatings.filter((item) => item.id !== ratingId);
  if (db.resourceRatings.length === before) {
    return false;
  }

  await saveDb(db);
  return true;
}

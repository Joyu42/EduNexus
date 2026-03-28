import {
  loadDb,
  saveDb,
  type GroupMemberRecord,
  type GroupPostRecord,
  type GroupSharedResourceRecord,
  type GroupTaskRecord,
  type PublicGroupRecord
} from "./store";

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function listGroups() {
  const db = await loadDb();
  return db.publicGroups.slice();
}

export async function createGroup(input: {
  name: string;
  description?: string;
  createdBy: string;
  memberCount?: number;
}) {
  const db = await loadDb();
  const record: PublicGroupRecord = {
    id: createId("group"),
    name: input.name,
    description: input.description ?? "",
    memberCount: input.memberCount ?? 1,
    createdBy: input.createdBy,
    createdAt: new Date().toISOString()
  };

  db.publicGroups.unshift(record);
  await saveDb(db);
  return record;
}

export async function updateGroup(
  groupId: string,
  input: Partial<Pick<PublicGroupRecord, "name" | "description">>
) {
  const db = await loadDb();
  const record = db.publicGroups.find((item) => item.id === groupId);
  if (!record) {
    return null;
  }

  if (typeof input.name === "string") {
    record.name = input.name;
  }
  if (typeof input.description === "string") {
    record.description = input.description;
  }
  await saveDb(db);
  return record;
}

export async function syncGroupMemberCount(groupId: string) {
  const db = await loadDb();
  const record = db.publicGroups.find((item) => item.id === groupId);
  if (!record) {
    return null;
  }

  const activeMemberCount = db.groupMembers.filter(
    (member) => member.groupId === groupId && member.status === "active"
  ).length;
  record.memberCount = activeMemberCount;
  await saveDb(db);
  return record;
}

export async function deleteGroup(groupId: string) {
  const db = await loadDb();
  const before = db.publicGroups.length;
  db.publicGroups = db.publicGroups.filter((item) => item.id !== groupId);
  if (db.publicGroups.length === before) {
    return false;
  }

  await saveDb(db);
  return true;
}

export async function listGroupMembers(groupId?: string) {
  const db = await loadDb();
  return groupId ? db.groupMembers.filter((member) => member.groupId === groupId) : db.groupMembers.slice();
}

export async function createGroupMember(input: {
  groupId: string;
  userId: string;
  role?: GroupMemberRecord["role"];
  status?: GroupMemberRecord["status"];
}) {
  const db = await loadDb();
  const record: GroupMemberRecord = {
    id: createId("group_member"),
    groupId: input.groupId,
    userId: input.userId,
    role: input.role ?? "member",
    status: input.status ?? "active",
    joinedAt: new Date().toISOString()
  };

  db.groupMembers.unshift(record);
  await saveDb(db);
  return record;
}

export async function updateGroupMember(
  memberId: string,
  input: Partial<Pick<GroupMemberRecord, "role" | "status">>
) {
  const db = await loadDb();
  const record = db.groupMembers.find((item) => item.id === memberId);
  if (!record) {
    return null;
  }

  if (input.role) {
    record.role = input.role;
  }
  if (input.status) {
    record.status = input.status;
  }

  await saveDb(db);
  return record;
}

export async function deleteGroupMember(memberId: string) {
  const db = await loadDb();
  const before = db.groupMembers.length;
  db.groupMembers = db.groupMembers.filter((item) => item.id !== memberId);
  if (db.groupMembers.length === before) {
    return false;
  }

  await saveDb(db);
  return true;
}

export async function listGroupPosts(groupId?: string) {
  const db = await loadDb();
  return groupId ? db.groupPosts.filter((post) => post.groupId === groupId) : db.groupPosts.slice();
}

export async function createGroupPost(input: {
  groupId: string;
  authorId: string;
  title: string;
  content: string;
}) {
  const db = await loadDb();
  const now = new Date().toISOString();
  const record: GroupPostRecord = {
    id: createId("group_post"),
    groupId: input.groupId,
    authorId: input.authorId,
    title: input.title,
    content: input.content,
    createdAt: now,
    updatedAt: now
  };

  db.groupPosts.unshift(record);
  await saveDb(db);
  return record;
}

export async function updateGroupPost(
  postId: string,
  input: Partial<Pick<GroupPostRecord, "title" | "content">>
) {
  const db = await loadDb();
  const record = db.groupPosts.find((item) => item.id === postId);
  if (!record) {
    return null;
  }

  if (typeof input.title === "string") {
    record.title = input.title;
  }
  if (typeof input.content === "string") {
    record.content = input.content;
  }
  record.updatedAt = new Date().toISOString();

  await saveDb(db);
  return record;
}

export async function deleteGroupPost(postId: string) {
  const db = await loadDb();
  const before = db.groupPosts.length;
  db.groupPosts = db.groupPosts.filter((item) => item.id !== postId);
  if (db.groupPosts.length === before) {
    return false;
  }

  await saveDb(db);
  return true;
}

export async function listGroupTasks(groupId?: string) {
  const db = await loadDb();
  return groupId ? db.groupTasks.filter((task) => task.groupId === groupId) : db.groupTasks.slice();
}

export async function createGroupTask(input: {
  groupId: string;
  title: string;
  description?: string;
  status?: GroupTaskRecord["status"];
  assigneeId?: string | null;
  dueDate?: string | null;
}) {
  const db = await loadDb();
  const now = new Date().toISOString();
  const record: GroupTaskRecord = {
    id: createId("group_task"),
    groupId: input.groupId,
    title: input.title,
    description: input.description ?? "",
    status: input.status ?? "todo",
    assigneeId: input.assigneeId ?? null,
    dueDate: input.dueDate ?? null,
    createdAt: now,
    updatedAt: now
  };

  db.groupTasks.unshift(record);
  await saveDb(db);
  return record;
}

export async function updateGroupTask(
  taskId: string,
  input: Partial<Pick<GroupTaskRecord, "title" | "description" | "status" | "assigneeId" | "dueDate">>
) {
  const db = await loadDb();
  const record = db.groupTasks.find((item) => item.id === taskId);
  if (!record) {
    return null;
  }

  if (typeof input.title === "string") {
    record.title = input.title;
  }
  if (typeof input.description === "string") {
    record.description = input.description;
  }
  if (input.status) {
    record.status = input.status;
  }
  if (input.assigneeId !== undefined) {
    record.assigneeId = input.assigneeId;
  }
  if (input.dueDate !== undefined) {
    record.dueDate = input.dueDate;
  }
  record.updatedAt = new Date().toISOString();

  await saveDb(db);
  return record;
}

export async function deleteGroupTask(taskId: string) {
  const db = await loadDb();
  const before = db.groupTasks.length;
  db.groupTasks = db.groupTasks.filter((item) => item.id !== taskId);
  if (db.groupTasks.length === before) {
    return false;
  }

  await saveDb(db);
  return true;
}

export async function listGroupSharedResources(groupId?: string) {
  const db = await loadDb();
  return groupId
    ? db.groupSharedResources.filter((resource) => resource.groupId === groupId)
    : db.groupSharedResources.slice();
}

export async function createGroupSharedResource(input: {
  groupId: string;
  resourceId: string;
  sharedBy: string;
  note?: string;
}) {
  const db = await loadDb();
  const record: GroupSharedResourceRecord = {
    id: createId("group_shared_resource"),
    groupId: input.groupId,
    resourceId: input.resourceId,
    sharedBy: input.sharedBy,
    note: input.note ?? "",
    createdAt: new Date().toISOString()
  };

  db.groupSharedResources.unshift(record);
  await saveDb(db);
  return record;
}

export async function updateGroupSharedResource(
  sharedResourceId: string,
  input: Pick<GroupSharedResourceRecord, "note">
) {
  const db = await loadDb();
  const record = db.groupSharedResources.find((item) => item.id === sharedResourceId);
  if (!record) {
    return null;
  }

  record.note = input.note;
  await saveDb(db);
  return record;
}

export async function deleteGroupSharedResource(sharedResourceId: string) {
  const db = await loadDb();
  const before = db.groupSharedResources.length;
  db.groupSharedResources = db.groupSharedResources.filter((item) => item.id !== sharedResourceId);
  if (db.groupSharedResources.length === before) {
    return false;
  }

  await saveDb(db);
  return true;
}

/**
 * Returns the active membership record for a user in a group, or null if none exists.
 * Only returns records where status is "active".
 */
export async function getActiveMembership(
  groupId: string,
  userId: string
): Promise<GroupMemberRecord | null> {
  const db = await loadDb();
  const membership = db.groupMembers.find(
    (member) => member.groupId === groupId && member.userId === userId && member.status === "active"
  );
  return membership ?? null;
}

/**
 * Returns true if the user is an active member of the group (owner, admin, or member).
 * Use getActiveMembership() if you need the full record.
 */
export async function isActiveMember(groupId: string, userId: string): Promise<boolean> {
  const membership = await getActiveMembership(groupId, userId);
  return membership !== null;
}

/**
 * Returns true only if the user is the active owner of the group.
 */
export async function isActiveOwner(groupId: string, userId: string): Promise<boolean> {
  const membership = await getActiveMembership(groupId, userId);
  return membership?.role === "owner";
}

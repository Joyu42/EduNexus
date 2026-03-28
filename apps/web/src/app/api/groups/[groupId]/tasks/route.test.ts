import { beforeEach, describe, expect, it, vi } from "vitest";

const getCurrentUserId = vi.fn();
const loadDb = vi.fn();
const listGroupTasks = vi.fn();
const createGroupTask = vi.fn();
const isActiveOwner = vi.fn();

vi.mock("@/lib/server/auth-utils", () => ({
  getCurrentUserId
}));

vi.mock("@/lib/server/store", () => ({
  loadDb
}));

vi.mock("@/lib/server/groups-service", () => ({
  listGroupTasks,
  createGroupTask,
  isActiveOwner
}));

const { GET: listTasksRoute, POST: createTaskRoute } = await import("./route");

describe("group tasks api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCurrentUserId.mockResolvedValue("session-user");
    loadDb.mockResolvedValue({
      publicGroups: [{ id: "group_1", createdBy: "owner", name: "g", description: "", memberCount: 1, createdAt: "" }]
    });
    listGroupTasks.mockResolvedValue([
      {
        id: "group_task_1",
        groupId: "group_1",
        title: "task one",
        description: "",
        status: "todo",
        assigneeId: null,
        dueDate: null,
        createdAt: "2026-03-17T00:00:00.000Z",
        updatedAt: "2026-03-17T00:00:00.000Z"
      }
    ]);
    isActiveOwner.mockResolvedValue(true);
    createGroupTask.mockResolvedValue({
      id: "group_task_new",
      groupId: "group_1",
      title: "new task",
      description: "description",
      status: "todo",
      assigneeId: null,
      dueDate: null,
      createdAt: "2026-03-17T00:00:00.000Z",
      updatedAt: "2026-03-17T00:00:00.000Z"
    });
  });

  it("lists tasks for existing group", async () => {
    const response = await listTasksRoute(new Request("http://localhost/api/groups/group_1/tasks"), {
      params: Promise.resolve({ groupId: "group_1" })
    });

    expect(response.status).toBe(200);
    expect(listGroupTasks).toHaveBeenCalledTimes(1);
    expect(listGroupTasks).toHaveBeenCalledWith("group_1");
    const payload = (await response.json()) as { success: boolean; data: { tasks: unknown[] } };
    expect(payload.success).toBe(true);
    expect(payload.data.tasks).toHaveLength(1);
  });

  it("rejects creating task when not logged in", async () => {
    getCurrentUserId.mockResolvedValue(null);

    const response = await createTaskRoute(
      new Request("http://localhost/api/groups/group_1/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "t", description: "d" })
      }),
      { params: Promise.resolve({ groupId: "group_1" }) }
    );

    expect(response.status).toBe(401);
    expect(createGroupTask).not.toHaveBeenCalled();
  });

  it("rejects creating task when group not found", async () => {
    loadDb.mockResolvedValue({ publicGroups: [] });

    const response = await createTaskRoute(
      new Request("http://localhost/api/groups/group_404/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "t", description: "d" })
      }),
      { params: Promise.resolve({ groupId: "group_404" }) }
    );

    expect(response.status).toBe(404);
    expect(createGroupTask).not.toHaveBeenCalled();
  });

  it("rejects creating task when user is not the active owner", async () => {
    isActiveOwner.mockResolvedValue(false);

    const response = await createTaskRoute(
      new Request("http://localhost/api/groups/group_1/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "t", description: "d" })
      }),
      { params: Promise.resolve({ groupId: "group_1" }) }
    );

    expect(response.status).toBe(403);
    expect(createGroupTask).not.toHaveBeenCalled();
  });

  it("creates a task for active owner", async () => {
    const response = await createTaskRoute(
      new Request("http://localhost/api/groups/group_1/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "  new task ", description: "  description  ", dueDate: "2026-04-01" })
      }),
      { params: Promise.resolve({ groupId: "group_1" }) }
    );

    expect(response.status).toBe(201);
    expect(createGroupTask).toHaveBeenCalledTimes(1);
    expect(createGroupTask).toHaveBeenCalledWith(
      expect.objectContaining({
        groupId: "group_1",
        title: "new task",
        description: "description",
        dueDate: "2026-04-01"
      })
    );
  });

  it("rejects creating task without title", async () => {
    const response = await createTaskRoute(
      new Request("http://localhost/api/groups/group_1/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "" })
      }),
      { params: Promise.resolve({ groupId: "group_1" }) }
    );

    expect(response.status).toBe(400);
    expect(createGroupTask).not.toHaveBeenCalled();
  });

  it("rejects creating task with whitespace-only title", async () => {
    const response = await createTaskRoute(
      new Request("http://localhost/api/groups/group_1/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "   " })
      }),
      { params: Promise.resolve({ groupId: "group_1" }) }
    );

    expect(response.status).toBe(400);
    expect(createGroupTask).not.toHaveBeenCalled();
  });
});

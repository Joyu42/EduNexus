// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  bindDocumentToTask,
  deleteTaskFromPath,
  pathStorage,
  renameTaskInPath,
  reorderTasksInPath,
  resolvePathDatabaseName,
  TaskDocumentBindingConflictError,
} from "@/lib/client/path-storage";
import { localStoragePathManager, resolvePathLocalStorageKey } from "@/lib/client/path-storage-fallback";

vi.mock("@/lib/auth/client-user-cache", () => ({
  getClientUserIdentity: () => "user_1",
}));

const basePath = {
  id: "path_1",
  title: "Java Basics",
  description: "",
  status: "not_started" as const,
  progress: 0,
  tags: [],
  createdAt: new Date("2026-03-24T00:00:00.000Z"),
  updatedAt: new Date("2026-03-24T00:00:00.000Z"),
  tasks: [
    {
      id: "task_1",
      title: "Intro",
      description: "",
      estimatedTime: "30m",
      progress: 0,
      status: "not_started" as const,
      dependencies: [],
      resources: [],
      notes: "",
      createdAt: new Date("2026-03-24T00:00:00.000Z"),
    },
    {
      id: "task_2",
      title: "Arrays",
      description: "",
      estimatedTime: "30m",
      progress: 0,
      status: "not_started" as const,
      dependencies: [],
      resources: [],
      notes: "",
      createdAt: new Date("2026-03-24T00:00:00.000Z"),
    },
  ],
  milestones: [],
  isPublic: false,
  difficulty: "beginner" as const,
  estimatedDuration: 60,
  version: 1,
};

describe("path storage scope", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("builds user-scoped keys for known identities", () => {
    expect(resolvePathDatabaseName("user_1")).toBe("EduNexusPath_user_1");
    expect(resolvePathLocalStorageKey("user_1")).toBe("edunexus_learning_paths_user_1");
  });

  it("does not create anonymous fallback keys", () => {
    expect(resolvePathDatabaseName(null)).toBeNull();
    expect(resolvePathLocalStorageKey(null)).toBeNull();
  });

  it("keeps pack hydration separate from storage scope resolution", () => {
    expect(resolvePathDatabaseName("user_1")).toBe("EduNexusPath_user_1");
    expect(resolvePathLocalStorageKey("user_1")).toBe("edunexus_learning_paths_user_1");
  });

  it("preserves binding lifecycle state through local storage round-trips", () => {
    const bound = bindDocumentToTask(basePath, "task_1", {
      documentId: "doc_1",
      documentTitle: "Doc 1",
      boundAt: new Date("2026-03-24T01:00:00.000Z"),
      draft: {
        draftId: "draft_1",
        draftTitle: "Draft 1",
        draftContent: "hello",
        updatedAt: new Date("2026-03-24T01:10:00.000Z"),
      },
    });

    const renamed = renameTaskInPath(bound, "task_1", "Intro Updated");
    const reordered = reorderTasksInPath(renamed, ["task_2", "task_1"]);
    const deleted = deleteTaskFromPath(reordered, "task_1");

    expect(deleted.removedTask?.documentBinding?.documentId).toBe("doc_1");
    expect(deleted.removedTask?.documentBinding?.draft?.draftId).toBe("draft_1");
    expect(deleted.path.tasks).toHaveLength(1);
    expect(deleted.path.tasks[0].id).toBe("task_2");
    expect(deleted.path.tasks[0].documentBinding).toBeUndefined();
    expect(deleted.path.deletedDocumentDrafts?.[0]?.draftId).toBe("draft_1");
  });

  it("rejects duplicate document bindings across paths", () => {
    const otherPath = {
      ...basePath,
      id: "path_2",
      tasks: [
        {
          ...basePath.tasks[0],
          id: "task_3",
          title: "Linked",
          documentBinding: {
            documentId: "doc_1",
            boundAt: new Date("2026-03-24T02:00:00.000Z"),
          },
        },
      ],
    };

    expect(() =>
      bindDocumentToTask(basePath, "task_1", {
        documentId: "doc_1",
        boundAt: new Date("2026-03-24T03:00:00.000Z"),
      }, [basePath, otherPath])
    ).toThrow(TaskDocumentBindingConflictError);
  });

  it("rejects multiple bound tasks in a single save when any binding conflicts", async () => {
    const targetPath = {
      ...basePath,
      id: "path_target",
      tasks: [
        {
          ...basePath.tasks[0],
          id: "task_1",
          documentBinding: {
            documentId: "doc_ok",
            boundAt: new Date("2026-03-24T01:00:00.000Z"),
          },
        },
        {
          ...basePath.tasks[1],
          id: "task_2",
          documentBinding: undefined,
        },
      ],
    } as any;

    const conflictingPath = {
      ...basePath,
      id: "path_conflict",
      tasks: [
        {
          ...basePath.tasks[0],
          id: "task_9",
          documentBinding: {
            documentId: "doc_conflict",
            boundAt: new Date("2026-03-24T02:00:00.000Z"),
          },
        },
      ],
    } as any;

    const putMock = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(pathStorage, "initialize").mockResolvedValue();
    vi.spyOn(pathStorage, "getPath").mockResolvedValue(targetPath);
    vi.spyOn(pathStorage, "getAllPaths").mockResolvedValue([targetPath, conflictingPath]);
    (pathStorage as any).db = { put: putMock };

    await expect(
      pathStorage.updatePath(targetPath.id, {
        tasks: [
          {
            ...targetPath.tasks[0],
            documentBinding: {
              documentId: "doc_ok",
              boundAt: new Date("2026-03-24T03:00:00.000Z"),
            },
          },
          {
            ...targetPath.tasks[1],
            documentBinding: {
              documentId: "doc_conflict",
              boundAt: new Date("2026-03-24T04:00:00.000Z"),
            },
          },
        ],
      } as any)
    ).rejects.toThrow(TaskDocumentBindingConflictError);

    expect(putMock).not.toHaveBeenCalled();
  });

  it("round-trips document bindings through the local storage manager", () => {
    const stored = localStoragePathManager.createPath({
      ...basePath,
      id: "path_round_trip",
      tasks: bindDocumentToTask(basePath, "task_1", {
        documentId: "doc_1",
        documentTitle: "Doc 1",
        boundAt: new Date("2026-03-24T01:00:00.000Z"),
      }).tasks,
    } as any);

    const reloaded = localStoragePathManager.getPath(stored.id);
    expect(reloaded).toBeDefined();
    if (!reloaded) {
      throw new Error("Expected stored path to reload");
    }
    expect(reloaded.tasks[0].documentBinding?.documentId).toBe("doc_1");
    expect(reloaded.tasks[0].documentBinding?.boundAt).toBeInstanceOf(Date);
    expect(reloaded.deletedDocumentDrafts).toBeUndefined();
  });

  describe("updatePath routing", () => {
    it("calls PATCH /api/graph/learning-pack/[id] for lp_* paths", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({ ok: true } as Response);
      const putMock = vi.fn().mockResolvedValue(undefined);
      const learningPackPath = {
        ...basePath,
        id: "lp_abc123",
      };

      vi.spyOn(pathStorage, "initialize").mockResolvedValue();
      vi.spyOn(pathStorage, "getPath").mockResolvedValue(learningPackPath as any);
      vi.spyOn(pathStorage, "getAllPaths").mockResolvedValue([learningPackPath as any]);
      (pathStorage as any).db = { put: putMock };

      await pathStorage.updatePath("lp_abc123", {
        title: "Advanced Java",
        topic: "programming-fundamentals",
      } as any);

      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/graph/learning-pack/lp_abc123",
        expect.objectContaining({
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: "Advanced Java",
            topic: "programming-fundamentals",
            tasks: learningPackPath.tasks,
          }),
        })
      );
    });

    it("calls POST /api/path/sync for non-lp_* paths", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({ ok: true } as Response);
      const putMock = vi.fn().mockResolvedValue(undefined);

      vi.spyOn(pathStorage, "initialize").mockResolvedValue();
      vi.spyOn(pathStorage, "getPath").mockResolvedValue(basePath as any);
      vi.spyOn(pathStorage, "getAllPaths").mockResolvedValue([basePath as any]);
      (pathStorage as any).db = { put: putMock };

      await pathStorage.updatePath("path_xyz", {
        title: "Advanced Java",
        topic: "programming-fundamentals",
      } as any);

      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/path/sync",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });
  });

  describe("deletePath routing", () => {
    it("calls DELETE /api/graph/learning-pack/[id] for lp_* paths", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({ ok: true } as Response);

      vi.spyOn(pathStorage, "initialize").mockResolvedValue();
      (pathStorage as any).db = { delete: vi.fn().mockResolvedValue(undefined) };

      await pathStorage.deletePath("lp_abc123");

      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/graph/learning-pack/lp_abc123",
        expect.objectContaining({ method: "DELETE" })
      );
    });

    it("calls DELETE /api/path/sync for non-lp_* paths", async () => {
      const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({ ok: true } as Response);

      vi.spyOn(pathStorage, "initialize").mockResolvedValue();
      (pathStorage as any).db = { delete: vi.fn().mockResolvedValue(undefined) };

      await pathStorage.deletePath("path_xyz");

      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/path/sync?pathId=path_xyz",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });
});

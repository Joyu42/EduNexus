import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createResourceFolderOnServer,
  createResourceNoteOnServer,
  createResourceOnServer,
  deleteResourceOnServer,
  fetchResourceFoldersFromServer,
  fetchResourceFromServer,
  fetchResourceNotesFromServer,
  fetchResourcesFromServer,
  getResourceRatingFromServer,
  updateResourceFolderOnServer,
  updateResourceOnServer,
  upsertResourceRatingOnServer,
} from "./resource-storage";

describe("resource-storage server adapters", () => {
  const fetchMock = vi.fn<typeof fetch>();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("fetchResourcesFromServer maps envelope payload and query params", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            resources: [
              {
                id: "resource_1",
                title: "Cambridge 18",
                description: "Reading",
                url: "https://example.com",
                createdBy: "session-user",
                createdAt: "2026-03-27T00:00:00.000Z",
              },
            ],
            total: 1,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await fetchResourcesFromServer({ q: "cambridge", sort: "title", limit: 10 });

    expect(result.total).toBe(1);
    expect(result.resources).toHaveLength(1);
    const [requestUrl] = fetchMock.mock.calls[0];
    expect(String(requestUrl)).toContain("/api/resources?");
    expect(String(requestUrl)).toContain("q=cambridge");
    expect(String(requestUrl)).toContain("sort=title");
    expect(String(requestUrl)).toContain("limit=10");
  });

  it("fetchResourceFromServer returns null on not-found", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: false,
          error: { code: "RESOURCE_NOT_FOUND", message: "missing" },
        }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await fetchResourceFromServer("resource_missing");
    expect(result).toBeNull();
  });

  it("create/update/delete resource adapters call canonical endpoints", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              resource: {
                id: "resource_1",
                title: "Cambridge 18",
                description: "Reading",
                url: "https://example.com",
                createdBy: "session-user",
                createdAt: "2026-03-27T00:00:00.000Z",
              },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: {
              resource: {
                id: "resource_1",
                title: "Cambridge 19",
                description: "Updated",
                url: "https://example.com/new",
                createdBy: "session-user",
                createdAt: "2026-03-27T00:00:00.000Z",
              },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, data: { deleted: true } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    await createResourceOnServer({ title: "Cambridge 18", description: "Reading", url: "https://example.com" });
    await updateResourceOnServer("resource_1", {
      title: "Cambridge 19",
      description: "Updated",
      url: "https://example.com/new",
    });
    const deleted = await deleteResourceOnServer("resource_1");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/resources",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/resources/resource_1",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/resources/resource_1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(deleted).toBe(true);
  });

  it("folder/note/rating adapters map response envelopes", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, data: { folders: [{ id: "folder_1", name: "IELTS", description: "", resourceIds: [] }] } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, data: { folder: { id: "folder_1", name: "IELTS", description: "", resourceIds: ["resource_1"] } } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, data: { note: { id: "note_1", resourceId: "resource_1", content: "set 3" } } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, data: { notes: [{ id: "note_1", resourceId: "resource_1", content: "set 3" }] } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, data: { rating: { id: "rating_1", resourceId: "resource_1", rating: 4 } } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ success: true, data: { rating: { id: "rating_1", resourceId: "resource_1", rating: 5 } } }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );

    const folders = await fetchResourceFoldersFromServer();
    await updateResourceFolderOnServer("folder_1", { resourceIds: ["resource_1"] });
    await createResourceNoteOnServer({ resourceId: "resource_1", content: "set 3" });
    const notes = await fetchResourceNotesFromServer("resource_1");
    const rating = await getResourceRatingFromServer("resource_1");
    const upserted = await upsertResourceRatingOnServer("resource_1", 5);

    expect(folders.folders).toHaveLength(1);
    expect(notes.notes).toHaveLength(1);
    expect(rating?.rating).toBe(4);
    expect(upserted.rating).toBe(5);

    expect(fetchMock).toHaveBeenCalledWith("/api/resources/folders", undefined);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/resources/folders?folderId=folder_1",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/resources/notes?resourceId=resource_1",
      undefined,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/resources/resource_1/rating",
      expect.objectContaining({ method: "PATCH" }),
    );
  });

  it("createResourceFolderOnServer posts folder payload", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            folder: {
              id: "folder_2",
              name: "Grammar",
              description: "notes",
              resourceIds: ["resource_2"],
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const result = await createResourceFolderOnServer({
      name: "Grammar",
      description: "notes",
      resourceIds: ["resource_2"],
    });

    expect(result.name).toBe("Grammar");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/resources/folders",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

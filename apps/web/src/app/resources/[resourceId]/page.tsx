"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpenText,
  Calendar,
  ExternalLink,
  Link as LinkIcon,
  Loader2,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createResourceNoteOnServer,
  deleteResourceNoteOnServer,
  fetchResourceFromServer,
  fetchResourceNotesFromServer,
  getResourceRatingFromServer,
  updateResourceNoteOnServer,
  upsertResourceRatingOnServer,
} from "@/lib/resources/resource-storage";

export default function ResourceDetailsPage({
  params,
}: {
  params: Promise<{ resourceId: string }>;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { status } = useSession();
  const { resourceId } = use(params);
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");

  const resourceQuery = useQuery({
    queryKey: ["resource", resourceId],
    queryFn: () => fetchResourceFromServer(resourceId),
  });

  const notesQuery = useQuery({
    queryKey: ["resource-notes", resourceId],
    queryFn: () => fetchResourceNotesFromServer(resourceId),
    enabled: status === "authenticated" && Boolean(resourceQuery.data),
  });

  const ratingQuery = useQuery({
    queryKey: ["resource-rating", resourceId],
    queryFn: () => getResourceRatingFromServer(resourceId),
    enabled: status === "authenticated" && Boolean(resourceQuery.data),
  });

  const createNoteMutation = useMutation({
    mutationFn: (content: string) => createResourceNoteOnServer({ resourceId, content }),
    onSuccess: () => {
      toast.success("已添加笔记");
      setNewNote("");
      queryClient.invalidateQueries({ queryKey: ["resource-notes", resourceId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ noteId, content }: { noteId: string; content: string }) =>
      updateResourceNoteOnServer(noteId, { content }),
    onSuccess: () => {
      toast.success("笔记已更新");
      setEditingNoteId(null);
      setEditingNoteContent("");
      queryClient.invalidateQueries({ queryKey: ["resource-notes", resourceId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteNoteMutation = useMutation({
    mutationFn: deleteResourceNoteOnServer,
    onSuccess: () => {
      toast.success("笔记已删除");
      queryClient.invalidateQueries({ queryKey: ["resource-notes", resourceId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const ratingMutation = useMutation({
    mutationFn: (rating: number) => upsertResourceRatingOnServer(resourceId, rating),
    onSuccess: () => {
      toast.success("评分已提交");
      queryClient.invalidateQueries({ queryKey: ["resource-rating", resourceId] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const resource = resourceQuery.data;
  const notes = notesQuery.data?.notes ?? [];

  const formatDate = (dateString?: string) => {
    if (!dateString) return "未知时间";
    try {
      return new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(dateString));
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/40 via-lime-50/20 to-teal-50/30">
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.back()} title="返回上一页">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500 text-white shadow-sm">
              <BookOpenText className="h-5 w-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">资源详情</h1>
          </div>
        </div>

        {resourceQuery.isLoading ? (
          <div className="py-24 flex flex-col items-center justify-center text-muted-foreground space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-500/50" />
            <p className="text-lg animate-pulse">加载资源详情中...</p>
          </div>
        ) : !resource ? (
          <Card className="p-12 text-center border-dashed">
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <BookOpenText className="h-8 w-8 text-destructive/60" />
            </div>
            <h3 className="text-xl font-medium mb-2">未找到该资源</h3>
            <p className="text-muted-foreground mb-6">资源可能已被删除或链接有误。</p>
            <Button onClick={() => router.push("/resources")} variant="outline">
              返回资源中心
            </Button>
          </Card>
        ) : (
          <div className="grid gap-6">
            <Card className="border-border/50 shadow-sm overflow-hidden">
              <div className="h-2 w-full bg-gradient-to-r from-emerald-400 to-teal-500" />
              <CardHeader className="space-y-4 pb-6">
                <CardTitle className="text-2xl sm:text-3xl leading-snug">{resource.title}</CardTitle>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4 shrink-0" />
                    <span>
                      分享者: <span className="font-medium text-foreground">{resource.createdBy}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 shrink-0" />
                    <time dateTime={resource.createdAt}>{formatDate(resource.createdAt)}</time>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-8">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">资源描述</h3>
                  <div className="bg-muted/30 p-4 sm:p-6 rounded-lg text-foreground/90 leading-relaxed whitespace-pre-wrap border border-border/50">
                    {resource.description || <span className="italic text-muted-foreground">分享者未提供详细描述。</span>}
                  </div>
                </div>

                {resource.url ? (
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <LinkIcon className="h-4 w-4 text-emerald-500" />
                      资源链接
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 bg-muted/50 p-3 rounded-md border border-border/50 flex items-center overflow-hidden">
                        <span className="truncate text-sm font-medium">{resource.url}</span>
                      </div>
                      <Link
                        href={resource.url}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
                      >
                        访问链接
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                ) : null}

                {status === "authenticated" ? (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">个人互动</h3>

                    <div className="flex gap-2 flex-wrap">
                      {[1, 2, 3, 4, 5].map((score) => (
                        <Button key={score} variant="outline" size="sm" onClick={() => ratingMutation.mutate(score)}>
                          {score} 星
                        </Button>
                      ))}
                      {ratingQuery.data?.rating ? (
                        <span className="text-sm text-muted-foreground self-center">当前评分: {ratingQuery.data.rating}</span>
                      ) : null}
                    </div>

                    <form
                      className="flex gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        const content = newNote.trim();
                        if (!content) {
                          return;
                        }
                        createNoteMutation.mutate(content);
                      }}
                    >
                      <Input
                        name="note"
                        placeholder="添加你的学习笔记"
                        value={newNote}
                        onChange={(event) => setNewNote(event.target.value)}
                      />
                      <Button type="submit" size="sm">
                        保存笔记
                      </Button>
                    </form>

                    <div className="space-y-2">
                      {notes.map((note) => (
                        <div key={note.id} className="rounded-md border px-3 py-2 text-sm text-muted-foreground space-y-2">
                          <div>{note.content}</div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingNoteId(note.id);
                                setEditingNoteContent(note.content);
                              }}
                            >
                              编辑笔记
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => deleteNoteMutation.mutate(note.id)}
                            >
                              删除笔记
                            </Button>
                          </div>
                          {editingNoteId === note.id ? (
                            <div className="flex gap-2">
                              <Input
                                aria-label="编辑笔记内容"
                                value={editingNoteContent}
                                onChange={(event) => setEditingNoteContent(event.target.value)}
                              />
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => {
                                  const content = editingNoteContent.trim();
                                  if (!content) {
                                    return;
                                  }
                                  updateNoteMutation.mutate({ noteId: note.id, content });
                                }}
                              >
                                保存编辑
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingNoteId(null);
                                  setEditingNoteContent("");
                                }}
                              >
                                取消
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

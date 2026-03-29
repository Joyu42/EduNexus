import React, { useState } from "react";
import { CommunityCommentRecord } from "@/lib/server/store";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { User, MessageSquare, Loader2, Edit, Trash2 } from "lucide-react";

export interface CommentThreadProps {
  comments: CommunityCommentRecord[];
  postId: string;
  currentUserId?: string;
  onSubmitComment: (content: string) => void;
  isSubmitting?: boolean;
  onEditComment?: (commentId: string, content: string) => void;
  onDeleteComment?: (commentId: string) => void;
}

export function CommentThread({
  comments,
  currentUserId,
  onSubmitComment,
  isSubmitting = false,
  onEditComment,
  onDeleteComment,
}: CommentThreadProps) {
  const [newComment, setNewComment] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    onSubmitComment(newComment);
    setNewComment("");
  };

  const handleEditSubmit = (commentId: string) => {
    if (!editContent.trim()) return;
    if (onEditComment) {
      onEditComment(commentId, editContent);
    }
    setEditingId(null);
  };

  return (
    <div className="space-y-6 mt-8">
      <div className="flex items-center gap-2 text-lg font-semibold border-b pb-2">
        <MessageSquare className="h-5 w-5" />
        <h3>评论 ({comments.length})</h3>
      </div>

      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 bg-muted/20 rounded-lg border border-dashed">
            暂无评论，来做第一个发言的人吧！
          </div>
        ) : (
          comments.map((comment) => {
            const isOwner = currentUserId === comment.authorId;
            const isEditing = editingId === comment.id;

            return (
              <Card key={comment.id} className="p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-secondary/50 p-1.5 rounded-full">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium">{comment.authorName ?? comment.authorId}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleDateString("zh-CN")}
                    </span>
                  </div>
                  {isOwner && !isEditing && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingId(comment.id);
                          setEditContent(comment.content);
                        }}
                        className="text-muted-foreground hover:text-blue-500"
                        title="编辑"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {onDeleteComment && (
                        <button
                          onClick={() => onDeleteComment(comment.id)}
                          className="text-muted-foreground hover:text-red-500"
                          title="删除"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="mt-2 space-y-2">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                        取消
                      </Button>
                      <Button size="sm" onClick={() => handleEditSubmit(comment.id)}>
                        保存
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm mt-2 whitespace-pre-wrap">{comment.content}</p>
                )}
              </Card>
            );
          })
        )}
      </div>

      <div className="bg-card border rounded-lg p-4 shadow-sm">
        <h4 className="font-medium mb-3 text-sm flex items-center gap-2">
          <Edit className="h-4 w-4" /> 发表评论
        </h4>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            placeholder="写下你的评论..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[100px] resize-y"
            disabled={isSubmitting}
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting || !newComment.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              发表评论
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

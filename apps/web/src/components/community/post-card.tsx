import { Card } from "@/components/ui/card";
import { User, Edit, Trash2 } from "lucide-react";
import Link from "next/link";
import { PublicPostRecord } from "@/lib/server/store";

export interface PostCardProps {
  post: PublicPostRecord;
  currentUserId?: string;
  onEdit?: (post: PublicPostRecord) => void;
  onDelete?: (postId: string) => void;
}

export function PostCard({ post, currentUserId, onEdit, onDelete }: PostCardProps) {
  const isOwner = currentUserId === post.authorId;

  return (
    <Card className="p-5 flex flex-col transition-shadow hover:shadow-md border-border/50">
      <div className="flex justify-between items-start gap-4 mb-3">
        <Link href={`/community/posts/${post.id}`} className="text-xl font-semibold leading-tight hover:text-orange-600 transition-colors">
          {post.title}
        </Link>
        <div className="flex items-center gap-2">
          {isOwner && onEdit && (
            <button
              onClick={() => onEdit(post)}
              className="text-xs flex items-center gap-1 text-muted-foreground hover:text-orange-600 bg-muted px-2 py-1 rounded-md"
              aria-label="编辑"
            >
              <Edit className="h-3 w-3" />
              编辑
            </button>
          )}
          {isOwner && onDelete && (
            <button
              onClick={() => onDelete(post.id)}
              className="text-xs flex items-center gap-1 text-muted-foreground hover:text-red-600 bg-muted px-2 py-1 rounded-md"
              aria-label="删除"
            >
              <Trash2 className="h-3 w-3" />
              删除
            </button>
          )}
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums bg-muted px-2 py-1 rounded-md">
            {new Date(post.createdAt).toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap mb-4">
        {post.content}
      </p>

      <div className="flex items-center mt-auto pt-4 border-t border-border/50 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5 bg-secondary/50 px-2 py-1 rounded-full">
          <User className="h-3 w-3" />
          <span className="font-medium text-foreground">{post.authorName || "匿名用户"}</span>
        </div>
        <Link href={`/community/posts/${post.id}`} className="ml-auto text-orange-600 hover:underline">
          查看详情
        </Link>
      </div>
    </Card>
  );
}

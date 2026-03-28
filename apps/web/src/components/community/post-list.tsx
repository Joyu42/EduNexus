import { Card } from "@/components/ui/card";
import { MessageSquareQuote } from "lucide-react";
import { PublicPostRecord } from "@/lib/server/store";
import { PostCard } from "./post-card";

export interface PostListProps {
  posts: PublicPostRecord[];
  currentUserId?: string;
  searchQuery?: string;
  onEdit?: (post: PublicPostRecord) => void;
  onDelete?: (postId: string) => void;
}

export function PostList({ posts, currentUserId, searchQuery = "", onEdit, onDelete }: PostListProps) {
  if (posts.length === 0) {
    return (
      <Card className="p-12 text-center border-dashed">
        <div className="mx-auto w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
          <MessageSquareQuote className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <h3 className="text-lg font-medium">没有找到帖子</h3>
        <p className="text-muted-foreground mt-1">
          {searchQuery ? "尝试换个搜索词试试" : "目前还没有人发布动态，成为第一个发布者吧！"}
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} currentUserId={currentUserId} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}

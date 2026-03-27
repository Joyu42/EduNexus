export type CommunityPost = {
  id: string;
  title: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt?: string;
};

export type CommunityTopic = {
  id: string;
  name: string;
  postCount?: number;
};

export type CommunityComment = {
  id: string;
  authorId: string;
  content: string;
  parentCommentId: string | null;
  createdAt: string;
  updatedAt?: string;
};

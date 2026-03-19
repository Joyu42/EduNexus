'use client';

import { useState } from 'react';
import { Heart, MessageCircle, Pin, Send } from 'lucide-react';
import type { GroupPost } from '@/lib/groups/group-types';

interface GroupDiscussionProps {
  posts: GroupPost[];
  currentUserId?: string;
  onLike?: (postId: string) => void;
  onComment?: (postId: string, content: string) => void;
  onCreatePost?: (title: string, content: string, type: 'discussion' | 'resource' | 'announcement') => void;
}

export function GroupDiscussion({ posts, currentUserId, onLike, onComment, onCreatePost }: GroupDiscussionProps) {
  const [showNewPost, setShowNewPost] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const handleCreatePost = () => {
    if (newPostTitle.trim() && newPostContent.trim() && onCreatePost) {
      onCreatePost(newPostTitle, newPostContent, 'discussion');
      setNewPostTitle('');
      setNewPostContent('');
      setShowNewPost(false);
    }
  };

  const handleComment = (postId: string) => {
    const content = commentInputs[postId]?.trim();
    if (content) {
      if (onComment) {
        onComment(postId, content);
      }
      setCommentInputs({ ...commentInputs, [postId]: '' });
    }
  };

  const sortedPosts = [...posts].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">讨论区</h3>
        <button
          onClick={() => setShowNewPost(!showNewPost)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
        >
          发布帖子
        </button>
      </div>

      {showNewPost && (
        <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-3">
          <input
            type="text"
            placeholder="帖子标题"
            value={newPostTitle}
            onChange={(e) => setNewPostTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            placeholder="分享你的想法..."
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowNewPost(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleCreatePost}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              发布
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {sortedPosts.map((post) => {
          const isLiked = currentUserId ? post.likedBy.includes(currentUserId) : false;

          return (
            <div key={post.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {post.authorAvatar ? (
                    <img src={post.authorAvatar} alt={post.authorName} className="w-full h-full rounded-full" />
                  ) : (
                    post.authorName.charAt(0).toUpperCase()
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{post.authorName}</span>
                    {post.isPinned && (
                      <div className="flex items-center gap-1 text-xs text-orange-600">
                        <Pin className="w-3 h-3" />
                        <span>置顶</span>
                      </div>
                    )}
                    {post.type === 'announcement' && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">公告</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    {new Date(post.createdAt).toLocaleString()}
                  </p>

                  <h4 className="font-semibold text-gray-900 mb-2">{post.title}</h4>
                  <p className="text-gray-700 whitespace-pre-wrap mb-3">{post.content}</p>

                  <div className="flex items-center gap-4 mb-3">
                    <button
                      onClick={() => onLike?.(post.id)}
                      className={`flex items-center gap-1 text-sm transition-colors ${
                        isLiked ? 'text-red-600' : 'text-gray-500 hover:text-red-600'
                      }`}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                      <span>{post.likes}</span>
                    </button>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <MessageCircle className="w-4 h-4" />
                      <span>{post.comments.length}</span>
                    </div>
                  </div>

                  {post.comments.length > 0 && (
                    <div className="space-y-2 mb-3 pl-4 border-l-2 border-gray-200">
                      {post.comments.map((comment) => (
                        <div key={comment.id} className="text-sm">
                          <span className="font-medium text-gray-900">{comment.authorName}</span>
                          <span className="text-gray-700 ml-2">{comment.content}</span>
                          <span className="text-xs text-gray-500 ml-2">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="写下你的评论..."
                      value={commentInputs[post.id] || ''}
                      onChange={(e) => setCommentInputs({ ...commentInputs, [post.id]: e.target.value })}
                      onKeyPress={(e) => e.key === 'Enter' && handleComment(post.id)}
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                    <button
                      onClick={() => handleComment(post.id)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
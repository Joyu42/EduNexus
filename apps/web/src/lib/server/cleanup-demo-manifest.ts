export const QA_GROUP_ID = "1774468684818";

export const SEEDED_KB_DOC_TITLES = [
  "HTML 基础",
  "CSS 基础",
  "JavaScript 基础",
  "Flexbox 布局",
  "Grid 布局",
  "React 入门",
  "响应式设计",
  "Web 无障碍",
] as const;

export const SEEDED_PREFIXES = {
  publicTopics: ["demo_topic_"],
  publicResources: ["demo_public_res_"],
  publicGroups: ["demo_group_", QA_GROUP_ID],
  publicPosts: ["demo_post_"],
  resourceBookmarks: ["demo_res_bookmark_"],
  resourceNotes: ["demo_res_note_"],
  resourceRatings: ["demo_res_rating_"],
  groupMembers: ["demo_group_member_"],
  groupPosts: ["demo_group_post_"],
  groupTasks: ["demo_group_task_"],
  communityComments: ["demo_post_comment_"],
  communityReactions: ["demo_post_reaction_"],
  sessions: ["ws_demo_"],
  syncedPaths: ["demo_path_"],
  plans: ["demo_goal_", "demo_graph_node::", "demo_graph_edge::"],
} as const;

export const SEEDED_NODE_PREFIX = "demo_node_";
export const SEEDED_GROUP_PREFIX = "demo_group_";
export const SEEDED_POST_PREFIX = "demo_post_";
export const SEEDED_RESOURCE_PREFIX = "demo_public_res_";

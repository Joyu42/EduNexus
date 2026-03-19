type KnowledgeBaseViewStateInput = {
  status: "loading" | "authenticated" | "unauthenticated";
  isLoading: boolean;
  documents: Array<{ id: string }>;
};

type KnowledgeBaseViewState =
  | { kind: "loading" }
  | { kind: "content" }
  | {
      kind: "empty";
      title: string;
      description: string;
    };

export function getKnowledgeBaseViewState(
  input: KnowledgeBaseViewStateInput
): KnowledgeBaseViewState {
  if (input.status !== "authenticated" || input.isLoading) {
    return { kind: "loading" };
  }

  if (input.documents.length === 0) {
    return {
      kind: "empty",
      title: "知识库还是空的",
      description: "创建第一篇文档，开始沉淀你的专属知识库。",
    };
  }

  return { kind: "content" };
}

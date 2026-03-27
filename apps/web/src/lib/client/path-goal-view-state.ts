type SurfaceStateInput = {
  isLoading: boolean;
  itemCount: number;
  isDemoUser: boolean;
};

type SurfaceState =
  | { kind: "loading" }
  | { kind: "content" }
  | { kind: "empty" };

function resolveSurfaceState(input: SurfaceStateInput): SurfaceState {
  if (input.isLoading) {
    return { kind: "loading" };
  }

  if (input.itemCount > 0) {
    return { kind: "content" };
  }

  return { kind: "empty" };
}

export function getPathPageState(input: {
  isLoading: boolean;
  pathCount: number;
  isDemoUser: boolean;
}): SurfaceState {
  return resolveSurfaceState({
    isLoading: input.isLoading,
    itemCount: input.pathCount,
    isDemoUser: input.isDemoUser,
  });
}

export function getLearningPathsPageState(input: {
  isLoading: boolean;
  pathCount: number;
  isDemoUser: boolean;
}): SurfaceState {
  return resolveSurfaceState({
    isLoading: input.isLoading,
    itemCount: input.pathCount,
    isDemoUser: input.isDemoUser,
  });
}

export function getGoalsPageState(input: {
  isLoading: boolean;
  goalCount: number;
  isDemoUser: boolean;
}): SurfaceState {
  return resolveSurfaceState({
    isLoading: input.isLoading,
    itemCount: input.goalCount,
    isDemoUser: input.isDemoUser,
  });
}

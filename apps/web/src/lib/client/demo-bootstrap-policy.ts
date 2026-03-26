type GoalsPageStateKind = "loading" | "content" | "empty" | "bootstrap_demo";

export function shouldSyncDemoDataInGoalsPage(input: {
  isDemoUser: boolean;
  goalsPageStateKind: GoalsPageStateKind;
}): boolean {
  return input.isDemoUser && input.goalsPageStateKind === "bootstrap_demo";
}

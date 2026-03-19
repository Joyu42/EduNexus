import { goalStorage } from "@/lib/goals/goal-storage";
import { pathStorage } from "@/lib/client/path-storage";
import { buildDemoStarterBundle, fetchDemoBootstrap } from "@/lib/client/demo-bootstrap";
import { seedDemoContentBundle } from "@/lib/client/demo-seeding";

export async function syncDemoClientData(userId: string): Promise<void> {
  const bootstrap = await fetchDemoBootstrap();
  if (!bootstrap) {
    return;
  }

  const bundle = buildDemoStarterBundle(bootstrap);
  const expectedGoalIds = new Set(bundle.goals.map((goal) => goal.id));
  const expectedPathIds = new Set(bundle.paths.map((path) => path.id));

  const existingGoals = goalStorage.getGoals();
  for (const goal of existingGoals) {
    if (goal.id.startsWith("demo_goal_") && !expectedGoalIds.has(goal.id)) {
      goalStorage.deleteGoal(goal.id);
    }
  }

  const existingPaths = await pathStorage.getAllPaths();
  for (const path of existingPaths) {
    const isDemoRelated = path.id.startsWith("demo_path_") || path.goalId?.startsWith("demo_goal_");
    if (isDemoRelated && !expectedPathIds.has(path.id)) {
      await pathStorage.deletePath(path.id);
    }
  }

  await seedDemoContentBundle(userId, bundle);
}

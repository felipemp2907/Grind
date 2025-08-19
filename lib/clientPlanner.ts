// Offline planner is disabled. All planning must go through server tRPC.
// Any accidental call will throw loudly.
export function createClientPlan() {
  throw new Error('OFFLINE_PLANNER_DISABLED: Use the server planner via trpcClient.goals.createUltimate.mutate({...}).');
}
export function convertPlanToTasks() {
  throw new Error('OFFLINE_PLANNER_DISABLED: Use the server planner via trpcClient.goals.createUltimate.mutate({...}).');
}

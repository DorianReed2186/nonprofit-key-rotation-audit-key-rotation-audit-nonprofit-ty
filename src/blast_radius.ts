export const workflowNames = [
  "donor-receipts",
  "volunteer-reminders",
  "campaign-reporting"
] as const;

export type WorkflowName = (typeof workflowNames)[number];

export type WorkflowImpact = {
  workflow: WorkflowName;
  touched: boolean;
  matchingRecords: number;
};

export type BlastRadius = {
  recordsInspected: number;
  recordsForTargetKey: number;
  touchedWorkflows: WorkflowName[];
  workflows: WorkflowImpact[];
};

export function summarizeBlastRadius(logData: unknown, targetKeyId: string): BlastRadius {
  const records = Array.isArray(logData)
    ? logData
    : typeof logData === "object" && logData !== null && "items" in logData && Array.isArray(logData.items)
      ? logData.items
      : (() => { throw new TypeError("Log search data must be an array or contain an items array"); })();
  const targetRecords = records.filter((record) =>
    JSON.stringify(record).includes(targetKeyId)
  );
  const workflows = workflowNames.map((workflow) => {
    const matchingRecords = targetRecords.filter((record) =>
      JSON.stringify(record).toLowerCase().includes(workflow)
    ).length;
    return { workflow, touched: matchingRecords > 0, matchingRecords };
  });

  return {
    recordsInspected: records.length,
    recordsForTargetKey: targetRecords.length,
    touchedWorkflows: workflows.filter((item) => item.touched).map((item) => item.workflow),
    workflows
  };
}

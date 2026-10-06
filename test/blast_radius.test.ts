import assert from "node:assert/strict";
import test from "node:test";
import { summarizeBlastRadius } from "../src/blast_radius.ts";

test("marks only target-key nonprofit workflows present in searched logs", () => {
  const result = summarizeBlastRadius({
    items: [
      { key: "key-target", operation: "donor-receipts", receipt: "R-104" },
      { key: "key-target", operation: "donor-receipts", receipt: "R-105" },
      { key: "key-target", operation: "campaign-reporting", campaign: "autumn-drive" },
      { key: "key-other", operation: "volunteer-reminders" }
    ]
  }, "key-target");

  assert.equal(result.recordsInspected, 4);
  assert.equal(result.recordsForTargetKey, 3);
  assert.deepEqual(result.touchedWorkflows, ["donor-receipts", "campaign-reporting"]);
  assert.deepEqual(result.workflows, [
    { workflow: "donor-receipts", touched: true, matchingRecords: 2 },
    { workflow: "volunteer-reminders", touched: false, matchingRecords: 0 },
    { workflow: "campaign-reporting", touched: true, matchingRecords: 1 }
  ]);
});

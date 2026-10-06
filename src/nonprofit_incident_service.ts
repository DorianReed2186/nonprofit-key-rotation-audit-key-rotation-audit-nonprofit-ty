import { randomUUID } from "node:crypto";
import { createServer, type ServerResponse } from "node:http";
import { z } from "zod";
import { summarizeBlastRadius } from "./blast_radius.ts";
import { InfraiClient, InfraiError } from "./infrai_client.ts";

const incidentSchema = z.object({
  projectId: z.string().min(1).optional(),
  keyName: z.string().min(1).default("nonprofit-incident-drill"),
  graceHours: z.number().int().min(0).max(24).default(1)
});

const createdKeySchema = z.object({ id: z.string().min(1), key: z.string().min(1) }).passthrough();

function sendJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(value, null, 2));
}

async function readJson(request: NodeJS.ReadableStream): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");
const infrai = new InfraiClient(apiKey);

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/incident") {
    sendJson(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const input = incidentSchema.parse(await readJson(request));
    const runId = randomUUID();
    const created = createdKeySchema.parse(
      await infrai.createTemporaryKey(input.projectId, input.keyName, `${runId}:create`)
    );

    await infrai.reportSuspectedCompromise(created.id);
    await infrai.rotateKey(created.id, input.graceHours, `${runId}:rotate`);
    const blastRadius = summarizeBlastRadius(await infrai.searchLogs(), created.id);

    sendJson(response, 200, {
      incidentId: runId,
      targetKeyId: created.id,
      rotation: { completed: true, graceHours: input.graceHours },
      blastRadius,
      keyCustody: "The created plaintext key was returned once and must be stored at creation time."
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      sendJson(response, 400, { error: "Invalid request", issues: error.issues });
      return;
    }
    if (error instanceof InfraiError) {
      const status = error.status >= 400 && error.status < 500 ? error.status : 502;
      sendJson(response, status, { error: error.code, details: error.details });
      return;
    }
    sendJson(response, 502, { error: "Incident workflow could not complete" });
  }
});

const port = Number(process.env.PORT ?? "3000");
server.listen(port, () => console.log(`Nonprofit incident service listening on http://localhost:${port}`));

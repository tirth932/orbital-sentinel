import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ZodType } from "zod";

import { anomaliesFileSchema, resultsSchema } from "@/lib/schemas";
import type { AnomalyRecord, Results } from "@/types/data";

async function readDataset<T>(file: string, schema: ZodType<T>): Promise<T> {
  const fullPath = path.join(process.cwd(), "public", "data", file);
  const raw = await readFile(fullPath, "utf8");
  const parsed = schema.safeParse(JSON.parse(raw) as unknown);
  if (!parsed.success) {
    throw new Error(`${file} did not match the expected schema.`);
  }
  return parsed.data;
}

export async function readResults(): Promise<Results> {
  return readDataset("results.json", resultsSchema);
}

export async function readAnomalies(): Promise<AnomalyRecord[]> {
  const file = await readDataset("anomalies.json", anomaliesFileSchema);
  return file.anomalies;
}

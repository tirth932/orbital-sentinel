import type { ZodType } from "zod";

export async function fetchDataset<T>(file: string, schema: ZodType<T>): Promise<T> {
  const response = await fetch(`/data/${file}`, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Could not load ${file} (${response.status}).`);
  }
  const payload: unknown = await response.json();
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new Error(`${file} did not match the expected schema.`);
  }
  return parsed.data;
}

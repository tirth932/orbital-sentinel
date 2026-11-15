import { HomePage } from "@/components/home/HomePage";
import { readAnomalies, readResults } from "@/lib/server-data";

export default async function Page() {
  try {
    const [results, anomalies] = await Promise.all([readResults(), readAnomalies()]);
    return <HomePage results={results} anomalies={anomalies} />;
  } catch {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <p className="max-w-md text-center font-mono text-sm text-amber">
          Dashboard data is missing or invalid. From the ml folder, run python -m scripts.make_sample_data.
        </p>
      </main>
    );
  }
}

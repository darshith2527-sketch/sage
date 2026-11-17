import Link from "next/link";
import { CONTRACT_TYPES } from "@/contracts/registry";

// The home page: pick an agreement to draft.
export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-4xl px-4 py-16 md:px-8">
        <h1 className="text-4xl font-bold tracking-tight">Sage</h1>
        <p className="mt-3 max-w-2xl text-lg text-zinc-600">
          Describe your deal in plain words. Get an agreement built from clauses checked against Indian
          law, explained clause by clause.
        </p>

        <h2 className="mt-12 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Draft an agreement
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {CONTRACT_TYPES.map((type) => (
            <Link
              key={type.id}
              href={`/draft/${type.id}`}
              className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-blue-400 hover:shadow-md"
            >
              <h3 className="font-semibold">{type.name}</h3>
              <p className="mt-1 text-sm text-zinc-600">{type.description}</p>
              <p className="mt-4 text-sm font-medium text-blue-600">Start →</p>
            </Link>
          ))}
        </div>

        <p className="mt-12 text-xs text-zinc-500">
          Sage is not a law firm and doesn&apos;t give legal advice. Have a lawyer review important agreements.
        </p>
      </div>
    </main>
  );
}

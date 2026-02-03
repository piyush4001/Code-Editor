import Link from "next/link";

export default function PlaygroundsPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-12">
      <h1 className="text-2xl font-semibold">Playgrounds</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Your playground list lives in the dashboard for now.
      </p>
      <div className="mt-6">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  );
}

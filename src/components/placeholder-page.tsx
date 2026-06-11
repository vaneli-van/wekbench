import { Construction } from "lucide-react";

export function PlaceholderPage({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center md:px-8">
      <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Construction className="size-6" />
      </span>
      <h1 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {description ??
          "This section is being ported from the original Next.js prototype. Tell me which screen to build out next."}
      </p>
    </div>
  );
}

import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return (
    <div className="space-y-4 py-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-40" />
      <Skeleton className="h-40" />
    </div>
  );
}

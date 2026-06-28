export default function AlertsLoading() {
  return (
    <div className="space-y-6 p-4 sm:p-8">
      <div className="flex gap-3">
        <div className="h-11 w-32 animate-pulse rounded-2xl bg-[#ececf0]" />
        <div className="h-11 w-36 animate-pulse rounded-2xl bg-[#ececf0]" />
      </div>
      <div className="rounded-3xl bg-white p-6 shadow-soft sm:p-8">
        <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="h-16 animate-pulse rounded-2xl bg-[#ececf0]" />
          <div className="h-16 animate-pulse rounded-2xl bg-[#ececf0]" />
          <div className="h-16 animate-pulse rounded-2xl bg-[#ececf0]" />
        </div>
      </div>
      <div className="overflow-hidden rounded-3xl bg-white shadow-soft">
        {Array.from({ length: 5 }).map((_, index) => (
          <div
            key={index}
            className="h-20 animate-pulse border-b border-[#f2f2f7] bg-white"
          />
        ))}
      </div>
    </div>
  );
}

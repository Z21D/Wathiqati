export default function DocumentsLoading() {
  return (
    <div className="space-y-8 p-4 sm:p-8">
      <div className="grid gap-8 xl:grid-cols-2">
        <div className="h-80 animate-pulse rounded-3xl bg-[#ececf0]" />
        <div className="h-80 animate-pulse rounded-3xl bg-[#ececf0]" />
      </div>
      <div className="rounded-3xl bg-white p-6 shadow-soft sm:p-8">
        <div className="h-7 w-48 animate-pulse rounded-full bg-[#ececf0]" />
        <div className="mt-6 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded-2xl bg-[#f2f2f7]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

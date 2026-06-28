export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-8 p-4 sm:p-8">
      <div className="h-24 rounded-3xl bg-[#ececf0]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-36 rounded-3xl bg-[#ececf0]" />
        ))}
      </div>
      <div className="grid gap-8 xl:grid-cols-5">
        <div className="h-96 rounded-3xl bg-[#ececf0] xl:col-span-3" />
        <div className="h-96 rounded-3xl bg-[#ececf0] xl:col-span-2" />
      </div>
    </div>
  );
}

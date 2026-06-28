import { redirect } from "next/navigation";

export default function LegacyPermitsPage() {
  redirect("/dashboard/documents");
}

import { redirect } from "next/navigation";
export default function PathPage() {
  redirect("/graph?view=path");
}

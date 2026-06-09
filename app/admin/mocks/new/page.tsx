import { redirect } from "next/navigation";

export default function AdminNewMockRedirect() {
  redirect("/teacher/mocks/new");
}

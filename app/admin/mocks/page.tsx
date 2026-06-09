import { redirect } from "next/navigation";

/** Mocks moved to /teacher/mocks (teacher role). */
export default function AdminMocksRedirect() {
  redirect("/teacher/mocks");
}

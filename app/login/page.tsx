import { redirect } from "next/navigation";

/**
 * /login is retired as a public page. Students log in from /welcome.
 * Teachers log in from /teacher. Admins log in from /admin.
 */
export default function LoginPage() {
  redirect("/welcome");
}

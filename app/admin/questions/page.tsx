import { redirect } from "next/navigation";

/** Question Bank moved to /teacher/questions (teacher role). */
export default function AdminQuestionsRedirect() {
  redirect("/teacher/questions");
}

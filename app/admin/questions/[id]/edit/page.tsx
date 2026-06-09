import { redirect } from "next/navigation";

export default function AdminEditQuestionRedirect({ params }: { params: { id: string } }) {
  redirect(`/teacher/questions/${params.id}/edit`);
}

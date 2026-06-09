import { redirect } from "next/navigation";

export default function AdminEditMockRedirect({ params }: { params: { id: string } }) {
  redirect(`/teacher/mocks/${params.id}/edit`);
}

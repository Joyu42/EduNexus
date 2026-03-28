import { redirect } from 'next/navigation';

export default function PathEditorPage() {
  redirect('/graph?view=path');
}

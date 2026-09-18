import Link from "next/link";
import { Pencil } from "lucide-react";

export function EmployeeEditLink({
  id,
  name,
  className = "",
}: {
  id: string;
  name: string;
  className?: string;
}) {
  return (
    <Link
      href={`/employees/${id}/edit`}
      aria-label={`Edit ${name}`}
      title="Edit employee"
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-cf-muted hover:bg-cf-soft hover:text-cf-primary ${className}`}
    >
      <Pencil className="h-3.5 w-3.5" />
    </Link>
  );
}

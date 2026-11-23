import { notFound } from "next/navigation";

/** Unknown /admin/... paths render the admin 404 inside the admin root layout. */
export default function UnknownAdminPage(): never {
  notFound();
}

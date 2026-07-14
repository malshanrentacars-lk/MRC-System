import { getTemplates } from "@/app/actions/agreements";
import { getSession } from "@/lib/auth";
import AgreementsListClient from "./AgreementsListClient";

export default async function AgreementsListPage() {
  const [session, templates] = await Promise.all([
    getSession(),
    getTemplates(),
  ]);

  const isAdmin = session?.role === "admin";

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Agreement Templates</h1>
          <p className="page-subtitle">
            {isAdmin ? "Manage agreement formats for rentals and suppliers" : "View agreement templates"}
          </p>
        </div>
      </div>

      <AgreementsListClient isAdmin={isAdmin} templates={templates} />
    </div>
  );
}

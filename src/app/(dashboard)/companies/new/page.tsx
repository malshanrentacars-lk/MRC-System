import NewCompanyClient from "./NewCompanyClient";

export default function NewCompanyPage() {
  return (
    <div className="space-y-5 animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Add Company</h1>
          <p className="page-subtitle">Register a new company</p>
        </div>
      </div>
      <NewCompanyClient />
    </div>
  );
}

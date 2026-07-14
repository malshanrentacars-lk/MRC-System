import { renderRentalAgreement } from "@/app/actions/agreements";
import { notFound } from "next/navigation";
import PrintButton from "./PrintButton";

export default async function AgreementPage({ params }: { params: Promise<{ id: string }> }) {
  const p = await params;
  const result = await renderRentalAgreement(p.id);

  if ('error' in result) notFound();

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: result.html }} />
      <div className="no-print mt-6 flex justify-center pb-8">
        <PrintButton />
      </div>
    </>
  );
}

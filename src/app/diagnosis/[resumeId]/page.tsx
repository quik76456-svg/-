import { DiagnosisClient } from "@/app/diagnosis/[resumeId]/DiagnosisClient";

export default async function DiagnosisPage(props: { params: Promise<{ resumeId: string }> }) {
  const { resumeId } = await props.params;
  return <DiagnosisClient resumeId={resumeId} />;
}

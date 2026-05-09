import { OptimizeClient } from "@/app/optimize/[resumeId]/OptimizeClient";

export default async function OptimizePage(props: { params: Promise<{ resumeId: string }> }) {
  const { resumeId } = await props.params;
  return <OptimizeClient resumeId={resumeId} />;
}

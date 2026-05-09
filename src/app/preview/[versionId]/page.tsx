import { db } from "@/server/db";

export default async function PreviewPage(props: { params: Promise<{ versionId: string }> }) {
  const { versionId } = await props.params;
  const version = await db.resumeVersion.findUnique({ where: { id: versionId } });
  if (!version) return <div>not_found</div>;

  return (
    <main style={{ padding: 24 }}>
      <pre>{JSON.stringify(version.templateFieldsJson, null, 2)}</pre>
    </main>
  );
}


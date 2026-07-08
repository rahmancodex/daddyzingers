// Convenience wrapper: default list page for a CMS module. Editors that
// don't have a custom drawer yet just render <CmsModulePage module="..." />.
import { CmsEntriesTable } from "./CmsEntriesTable";
import { CmsModuleShell } from "./CmsModuleShell";
import type { CmsModule } from "@/lib/cms-shared";

export function CmsModulePage({
  module,
  createTitle,
  emptyHint,
}: {
  module: CmsModule;
  /** Auto-create default title. Omit to disable the New button until an editor ships. */
  createTitle?: string;
  emptyHint?: string;
}) {
  return (
    <CmsModuleShell
      module={module}
      createDefaults={createTitle ? { title: createTitle } : undefined}
      emptyHint={emptyHint}
    >
      {({ rows }) => <CmsEntriesTable module={module} rows={rows as never} />}
    </CmsModuleShell>
  );
}

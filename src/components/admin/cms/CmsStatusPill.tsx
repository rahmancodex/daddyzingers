import { cn } from "@/lib/utils";
import { CMS_STATUS_CLASS, CMS_STATUS_LABEL, type CmsStatus } from "@/lib/cms-shared";

export function CmsStatusPill({
  status,
  className,
}: {
  status: CmsStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        CMS_STATUS_CLASS[status],
        className,
      )}
      aria-label={`Status: ${CMS_STATUS_LABEL[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" aria-hidden />
      {CMS_STATUS_LABEL[status]}
    </span>
  );
}

import { cn } from "@/lib/utils";
import type { NoticeArticleData } from "@/types/notice";

export interface NoticeArticleProps {
  /** The notice the article renders. */
  notice: NoticeArticleData;
  className?: string;
}

/**
 * Notice article body.
 * Figma "Notice article" (2:1813 desktop, 2:1883 tablet, 2:1949 mobile): a
 * 1px bordered surface with 24px padding, a 13px bold primary eyebrow, a
 * 20px semibold greeting and 16px body copy, closed by the signature block.
 */
export function NoticeArticle({ notice, className }: NoticeArticleProps) {
  return (
    <article
      className={cn(
        "flex w-full flex-col items-start gap-4 rounded-[12px] border border-border bg-surface p-6",
        className,
      )}
    >
      <p className="text-caption font-bold leading-[1.45] text-primary">
        {notice.eyebrow}
      </p>

      <h2 className="text-body-lg font-semibold leading-[1.45] text-ink">
        {notice.greeting}
      </h2>

      {/* One body block — the Figma article holds the copy as a single text node. */}
      <p className="min-h-[368px] w-full text-body leading-[1.45] text-muted md:min-h-[184px] xl:min-h-[138px]">
        {notice.body.join(" ")}
      </p>

      <p className="whitespace-pre-line text-body leading-[1.45] text-ink">
        {notice.signature}
      </p>
    </article>
  );
}

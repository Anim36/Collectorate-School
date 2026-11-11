/**
 * The shapes the notice board and the notice article share.
 *
 * They are kept apart from the mock data in `src/data/notices.ts`, so a page
 * that reads its notices from the database can hand the same shape to the
 * article and the attachment table the public board uses.
 */

/** A file attached to a notice. */
export interface NoticeAttachment {
  /** File name shown in the attachment table. */
  name: string;
  /** File format, e.g. "PDF". */
  format: string;
  /** File size, e.g. "240 KB". */
  size: string;
  /**
   * Id of the stored file, used by the file route.
   *
   * It is empty for an attachment that was never really uploaded, so the
   * table can show the name without offering a link that goes nowhere.
   */
  fileId?: string;
}

/** A notice, as the article and the table show it. */
export interface NoticeArticleData {
  /** Stable identifier of the notice. */
  id: string;
  /** Notice headline. */
  title: string;
  /** Eyebrow line of the article. */
  eyebrow: string;
  /** Salutation line of the article body. */
  greeting: string;
  /** Body paragraphs of the notice. */
  body: readonly string[];
  /** Signature block of the article. */
  signature: string;
  /** Files attached to the notice. */
  attachments: readonly NoticeAttachment[];
}

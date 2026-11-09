/**
 * How a picked file travels from the browser to the server.
 *
 * A server action carries JSON, so the bytes of a file cannot be sent as
 * they are: they travel as base64 text beside the name of the file.
 *
 * The helper lives in `src/lib`, so the browser side and the server side
 * read the same shape.
 */

/** A file the admin picked, with its bytes as base64 text. */
export interface EncodedFile {
  /** The name the browser sent. It is only kept for the display. */
  name: string;
  /** The bytes of the file, as base64 text. */
  base64: string;
  /** How many bytes the file holds. */
  size: number;
}

/**
 * Reads a file the admin picked and turns it into base64 text.
 *
 * The whole file is read into memory, so the size limit of the school is
 * checked by the server before the bytes are decoded.
 */
export async function encodeFile(file: File): Promise<EncodedFile> {
  const bytes = new Uint8Array(await file.arrayBuffer());

  return {
    name: file.name,
    base64: bytesToBase64(bytes),
    size: bytes.length,
  };
}

/**
 * The bytes of a file, as base64 text.
 *
 * The string is built in chunks, because a big file cannot be turned into a
 * string of character codes in one go without the browser running out of
 * room.
 */
export function bytesToBase64(bytes: Uint8Array): string {
  const chunkSize = 0x8000;
  let binary = "";

  for (let start = 0; start < bytes.length; start += chunkSize) {
    const chunk = bytes.subarray(start, start + chunkSize);

    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

/** A campus / community photograph sourced from the Figma design system. */
export interface SchoolPhoto {
  /** Stable identifier used as the image file name under /public/images. */
  readonly id: string;
  /** File name inside /public/images. */
  readonly src: string;
  /** Accessible alternative text. */
  readonly alt: string;
  /** Human label shown in the design-system preview. */
  readonly label: string;
  /** Intrinsic width of the downloaded asset. */
  readonly width: number;
  /** Intrinsic height of the downloaded asset. */
  readonly height: number;
}

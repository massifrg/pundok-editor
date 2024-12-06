/**
 * An interface to keep track of what the user is focusing on in the viewer
 * between successive renderings of the same document.
 */
export interface ViewerSetup {
  /** The name of the document shown in the viewer. */
  name: string;
  /** The raw content to be shown in the viewer. */
  content: string;
  /** The page to be shown. */
  page: number;
  /** The magnifying factor. */
  magnify: number;
  /** The x coordinate (as percent of width) of the page to be at the center in the viewer. */
  centerX: number;
  /** The y coordinate (as percent of height) of the page to be at the center in the viewer. */
  centerY: number;
}

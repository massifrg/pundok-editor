export interface ImageFormatDescription {
  name: string,
  description?: string,
  icon?: string,
  extensions: string[],
  isVectorial: boolean,
}

export const IMAGE_FORMATS: ImageFormatDescription[] = [
  {
    name: 'jpeg',
    description: 'JPEG image',
    icon: 'format_jpg',
    extensions: ['jpg', 'jpeg'],
    isVectorial: false,
  },
  {
    name: 'tiff',
    description: 'TIFF image',
    extensions: ['tif', 'tiff'],
    isVectorial: false,
  },
  {
    name: 'png',
    description: 'PNG image',
    icon: 'format_png',
    extensions: ['png'],
    isVectorial: false,
  },
  {
    name: 'gif',
    description: 'GIF image',
    icon: 'format_gif',
    extensions: ['gif'],
    isVectorial: false,
  },
  {
    name: 'svg',
    description: 'SVG image',
    extensions: ['svg'],
    isVectorial: true,
  },
  {
    name: 'pdf',
    description: 'PDF image',
    icon: 'format_pdf',
    extensions: ['pdf'],
    isVectorial: true,
  },
].map(f => ({ icon: 'image', ...f }))

/**
 * Guess the image format from its filename.
 * @param filename
 * @returns 
 */
export function imageFormatFromFilename(filename: string): ImageFormatDescription | undefined {
  return IMAGE_FORMATS.find(f => f.extensions.find(e => filename.endsWith('.' + e)))
}
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
    icon: 'mdi-file-jpg-box',
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
    icon: 'mdi-file-png-box',
    extensions: ['png'],
    isVectorial: false,
  },
  {
    name: 'gif',
    description: 'GIF image',
    icon: 'mdi-file-gif-box',
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
    icon: 'mdi-file-pdf-box',
    extensions: ['pdf'],
    isVectorial: true,
  },
].map(f => ({ icon: 'mdi-image', ...f }))

/**
 * Guess the image format from its filename.
 * @param filename
 * @returns 
 */
export function imageFormatFromFilename(filename: string): ImageFormatDescription | undefined {
  return IMAGE_FORMATS.find(f => f.extensions.find(e => filename.endsWith('.' + e)))
}
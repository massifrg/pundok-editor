export interface Target {
  url: string;
  title: string;
}

export function pandocTargetToImagePMAttrs(
  target: [url: string, title: string]
) {
  return {
    src: target[0],
    title: target[1],
  };
}

export function pandocTargetToLinkPMAttrs(
  target: [url: string, title: string]
) {
  return {
    href: target[0],
    title: target[1],
  };
}

import { createLowlight } from 'lowlight';
import javascript from 'highlight.js/lib/languages/javascript';
import typescript from 'highlight.js/lib/languages/typescript';
import lua from 'highlight.js/lib/languages/lua';
import latex from 'highlight.js/lib/languages/latex';

export const lowlight = createLowlight();

lowlight.register('javascript', javascript);
lowlight.register('typescript', typescript);
lowlight.register('lua', lua);
lowlight.register('latex', latex);

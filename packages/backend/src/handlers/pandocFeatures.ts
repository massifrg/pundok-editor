import type {
  PandocFeatureName,
  PandocFeatureOptions,
  PandocFormatExtension,
} from '../../../common/src';
import { pandocFeatures } from '../pandocFeatures';

export async function getPandocFeature(
  featureName: PandocFeatureName,
  options?: PandocFeatureOptions,
): Promise<string[] | PandocFormatExtension[]> {
  if (featureName === 'input-formats') return pandocFeatures.inputFormatNames();
  if (featureName === 'output-formats')
    return pandocFeatures.outputFormatNames();
  if (featureName === 'extensions' && options?.format)
    return pandocFeatures.getFormatExtensions(options.format);
  throw new Error(`Unknown "${featureName}" feature or wrong options`);
}

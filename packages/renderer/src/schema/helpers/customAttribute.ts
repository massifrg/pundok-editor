import { CustomAttribute, CustomClass, CustomStyleDef } from '../../common';

type KV = Record<string, string>;

function setAttributes(kv: KV, attributes?: CustomAttribute[]): KV {
  if (attributes) {
    const newKv = { ...kv };
    attributes.forEach((a) => {
      if (a.name) {
        if (a.default) newKv[a.name] = a.default;
        else if (a.values) newKv[a.name] = a.values[0];
      }
    });
    return newKv;
  }
  return kv;
}

/**
 * Sets the attributes in `attrs.kv` with the default values eventually set in a custom style definition.
 * @param kv
 * @param csd
 * @returns
 */
export function setAttributesOfCustomStyle(kv: KV, csd: CustomStyleDef): KV {
  // TODO: in case there'll be custom classes set by default by a custom style,
  //       we'll have to call setAttributesOfCustomClass accordingly
  return setAttributes(kv, csd.attributes);
}

/**
 * Sets the attributes in `attrs.kv` with the default values eventually set in a custom style definition.
 * @param kv
 * @param cc
 * @returns
 */
export function setAttributesOfCustomClass(kv: KV, cc: CustomClass): KV {
  return setAttributes(kv, cc.attributes);
}

function unsetAttributes(kv: KV, attributes?: CustomAttribute[]): KV {
  if (attributes) {
    const newKv = { ...kv };
    attributes.forEach((a) => {
      delete newKv[a.name];
    });
    return newKv;
  }
  return kv;
}

/**
 * Unsets the attributes in `attrs.kv` carried by a custom style definition.
 * @param kv
 * @param csd
 * @returns
 */
export function unsetAttributesOfCustomStyle(kv: KV, csd: CustomStyleDef): KV {
  // TODO: in case there'll be custom classes set by default by a custom style,
  //       we'll have to call setAttributesOfCustomClass accordingly
  return unsetAttributes(kv, csd.attributes);
}

/**
 * Unsets the attributes in `attrs.kv` carried by a custom style definition.
 * @param kv
 * @param cc
 * @returns
 */
export function unsetAttributesOfCustomClass(kv: KV, cc: CustomClass): KV {
  return unsetAttributes(kv, cc.attributes);
}

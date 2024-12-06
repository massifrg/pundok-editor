import { Attrs, Mark, Node } from '@tiptap/pm/model';
import { clone, isArray, isObject } from 'lodash';

interface ClassesAdded {
  change: 'add';
  classes: string[];
}

interface ClassesRemoved {
  change: 'remove';
  classes: string[];
}

export type ClassesChange = ClassesAdded | ClassesRemoved;

interface AttributeSet {
  change: 'set';
  name: string;
  value: any;
}

interface AttributeReset {
  change: 'reset';
  name: string;
}

interface AttributeChanged {
  change: 'modify';
  name: string;
  oldValue: any;
  newValue: any;
}

export type AttributeChange = AttributeSet | AttributeReset | AttributeChanged;

export interface AttrsChange {
  elemType: string;
  classes: ClassesChange[];
  attributes: AttributeChange[];
  kvAttributes: AttributeChange[];
}

/**
 * Check whether the value of an attribute is considered empty
 * @param value
 * @returns
 */
function isEmptyAttribute(name: string, value: any): boolean {
  return (
    value === undefined || value === null || (name === 'id' && value === '')
  );
}

export function getAttrsChange(
  nom: Node | Mark,
  newAttrs: Attrs,
  oldAttrs: Attrs
): AttrsChange {
  const elemType = nom.type.name;
  const classes: ClassesChange[] = [];
  const attributes: AttributeChange[] = [];
  const kvAttributes: AttributeChange[] = [];
  let newAttrsHaveClasses = false;
  let newAttrsHaveKv = false;

  Object.entries(newAttrs).forEach(([key, newValue]) => {
    if (key === 'classes' && isArray(newValue)) {
      newAttrsHaveClasses = true;
      const oldClasses = oldAttrs.classes || [];
      const added = (newValue as string[]).filter(
        (c) => oldClasses.indexOf(c) < 0
      );
      if (added.length > 0) classes.push({ change: 'add', classes: added });
      const removed = (oldClasses as string[]).filter(
        (c) => (newValue as string[]).indexOf(c) < 0
      );
      if (removed.length > 0)
        classes.push({ change: 'remove', classes: removed });
    } else if (key === 'kv') {
      newAttrsHaveKv = true;
      const oldKv = oldAttrs.kv || {};
      const newKv = newValue as Record<string, string>;
      Object.entries(newKv).forEach(([name, v]) => {
        const oldValue = oldKv[name];
        if (!oldValue) {
          kvAttributes.push({ change: 'set', name: name, value: v });
        } else if (v !== oldValue) {
          kvAttributes.push({
            change: 'modify',
            name: name,
            oldValue,
            newValue: v,
          });
        }
      });
      Object.keys(oldKv).forEach((name) => {
        if (!newKv[name]) {
          kvAttributes.push({ change: 'reset', name });
        }
      });
    } else {
      const oldValue = oldAttrs[key];
      const isNewEmpty = isEmptyAttribute(key, newValue);
      const isOldEmpty = isEmptyAttribute(key, oldValue);
      if (isOldEmpty && !isNewEmpty) {
        attributes.push({ change: 'set', name: key, value: newValue });
      } else if (!isNewEmpty && !isOldEmpty && oldValue !== newValue) {
        attributes.push({
          change: 'modify',
          name: key,
          oldValue,
          newValue: newValue,
        });
      }
    }
  });

  Object.entries(oldAttrs).forEach(([key, oldValue]) => {
    if (
      key === 'classes' &&
      !newAttrsHaveClasses &&
      isArray(oldValue) &&
      oldValue.length > 0
    ) {
      classes.push({ change: 'remove', classes: oldValue as string[] });
    } else if (key === 'kv' && !newAttrsHaveKv && isObject(oldValue)) {
      Object.keys(oldValue).forEach((name) => {
        kvAttributes.push({ change: 'reset', name });
      });
    } else {
      if (
        isEmptyAttribute(key, newAttrs[key]) &&
        !isEmptyAttribute(key, oldValue)
      ) {
        attributes.push({ change: 'reset', name: key });
      }
    }
  });

  return {
    elemType,
    classes,
    attributes,
    kvAttributes,
  };
}

export function canApplyRepeatableChange(
  elem: Node | Mark | null | undefined,
  changes: AttrsChange
): boolean {
  return !!elem && elem.type.name === changes.elemType;
  // FIXME: we should consider Marks that differ by attributes and not by type name (https://prosemirror.net/docs/ref/#model.MarkSpec.excludes)
}

export function updateAttrsWithChanges(
  elem: Node | Mark,
  changes: AttrsChange
): Attrs {
  if (!canApplyRepeatableChange(elem, changes)) return elem.attrs;
  let newClasses: string[] = [];
  let newKv: Record<string, string> = {};
  let newAttrs: Record<string, any> = { ...elem.attrs };
  Object.entries(elem.attrs).forEach(([k, v]) => {
    if (k === 'classes') {
      newClasses = [...(v as string[])];
      changes.classes.forEach(({ change, classes }) => {
        if (change === 'add') {
          classes.forEach((c) => {
            if (newClasses.indexOf(c) < 0) newClasses.push(c);
          });
        } else if (change === 'remove') {
          classes.forEach((c) => {
            if (newClasses.indexOf(c) >= 0)
              newClasses = newClasses.filter((ec) => ec !== c);
          });
        }
      });
    } else if (k === 'kv') {
      newKv = clone(v);
      changes.kvAttributes.forEach((change) => {
        if (change.change === 'set') {
          newKv[change.name] = change.value;
        } else if (change.change === 'reset') {
          delete newKv[change.name];
        } else if (change.change === 'modify') {
          // TODO: decide whether to change it only if the old value is the same
          const oldValue = newKv[change.name];
          if (oldValue === change.oldValue)
            newKv[change.name] = change.newValue;
        }
      });
    } else {
      changes.attributes.forEach((change) => {
        if (change.change === 'set') {
          newAttrs[change.name] = change.value;
        } else if (change.change === 'reset') {
          delete newAttrs[change.name];
        } else if (change.change === 'modify') {
          // TODO: decide whether to change it only if the old value is the same
          const oldValue = newAttrs[change.name];
          if (oldValue === change.oldValue)
            newAttrs[change.name] = change.newValue;
        }
      });
    }
  });
  newAttrs.classes = newClasses;
  newAttrs.kv = newKv;
  return newAttrs;
}

export function describeAttrsChange(
  change: AttrsChange,
  joiner: string = '\n'
): string {
  const desc: string[] = [];
  (change.classes || []).forEach(({ change, classes }) => {
    const d =
      classes.length === 1
        ? `- ${change} class "${classes[0]}"`
        : `- ${change} classes: ${classes.map((c) => '"' + c + '"').join(',')}`;
    desc.push(d);
  });
  (change.kvAttributes || []).forEach((change) => {
    if (change.change === 'set')
      desc.push(`- set kv.${change.name} to "${change.value}"`);
    else if (change.change === 'reset')
      desc.push(`- kv.${change.name} removed`);
    else if (change.change === 'modify')
      desc.push(
        `- change kv.${change.name} to "${change.newValue}" (from "${change.oldValue}")`
      );
  });
  (change.attributes || []).forEach((change) => {
    if (change.change === 'set')
      desc.push(`- set ${change.name} to "${change.value}"`);
    else if (change.change === 'reset') desc.push(`- ${change.name} removed`);
    else if (change.change === 'modify')
      desc.push(
        `- change ${change.name} to "${change.newValue}" (from "${change.oldValue}")`
      );
  });
  return desc.join(joiner);
}

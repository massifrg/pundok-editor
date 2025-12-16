interface AttrStruct {
  id?: string,
  classes?: string[],
  attributes?: Record<string, string>
}

export function attrsToCssSelectorString(attr: AttrStruct): string {
  const id = attr.id ? '#' + attr.id : ''
  const classes = attr.classes ? attr.classes.sort().map(c => `.${c}`).join('') : ''
  const attributes = attr.attributes
    ? Object.entries(attr.attributes)
      .sort(([n1, v1], [n2, v2]) => n1.localeCompare(n2))
      .map(([n, v]) => `[${n}=${v}]`)
      .join('')
    : ''
  return id + classes + attributes
}
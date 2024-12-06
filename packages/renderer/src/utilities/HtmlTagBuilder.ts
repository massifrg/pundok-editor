import { mergeAttributes } from '@tiptap/core'
import { isNumber } from 'lodash'
import OrderedMap from 'orderedmap'
// import { isEqual } from 'lodash'

export interface HtmlTagBuilderFields {
  tag: string,
  classes: string[],
  otherAttrs: {
    [name: string]: string
  },
  styles: OrderedMap<string>
}

export enum TagType {
  Unknown = 0,
  Inline = 1,
  Block = 2,
  BlockOfBlocks = 3,
  EmptyInline = 4,
  EmptyBlock = 5,
}

const tagTypeToFlags: { [t: number]: [nlOpen: boolean, nlClose: boolean, empty: boolean] } = {
  [TagType.Inline]: [false, false, false],
  [TagType.EmptyInline]: [false, false, true],
  [TagType.Block]: [false, true, false],
  [TagType.EmptyBlock]: [true, true, true],
  [TagType.BlockOfBlocks]: [true, true, false],
}

function escapeDblQuotes(s: string | number): string {
  const text = isNumber(s) ? s.toString() : (s || '')
  return text.replace(/"/g, '"')
}

class HtmlTagBuilder implements HtmlTagBuilderFields {

  _tag: string = 'tag'

  newlineAfterOpeningTag = false

  newlineAfterClosingTag = false

  empty = false

  classes: string[] = []

  otherAttrs: { [name: string]: string } = {}

  styles: OrderedMap<string> = OrderedMap.from({})

  get tag(): string {
    return this._tag
  }

  set tag(_tag) {
    if (_tag && typeof _tag === 'string') this._tag = _tag
  }

  set tagType(t: TagType) {
    const flags: [boolean, boolean, boolean] = tagTypeToFlags[t] || [false, false, false]
    this.newlineAfterOpeningTag = flags[0]
    this.newlineAfterClosingTag = flags[1]
    this.empty = flags[2]
  }

  // get tagType(): TagType {
  //   const flags = [
  //     this.newlineAfterOpeningTag,
  //     this.newlineAfterClosingTag,
  //     this.empty
  //   ]
  //   const found = Object.values(TagType).find( t => {
  //     if ( typeof t !== 'string' && isEqual( flags, tagTypeToFlags[t]) ) return t
  //   })
  //   return Number(found) || TagType.Unknown
  // }

  private getOpeningTag(empty: boolean = false) {
    const attrNames = Object.keys(this.otherAttrs)
    if (this.classes.length > 0) attrNames.push('class')
    if (this.styles.size > 0) attrNames.push('style')
    const attributesString = attrNames
      .sort()
      .map(a => ` ${a}="${escapeDblQuotes(this.attributeValue(a))}"`).join('')
    const newline = this.newlineAfterOpeningTag ? '\n' : ''
    const emptyBar = (empty || this.empty) ? '/' : ''
    return `<${this._tag}${attributesString}${emptyBar}>${newline}`
  }

  get openingTag(): string {
    return this.getOpeningTag(this.empty)
  }

  get emptyTag(): string {
    return this.getOpeningTag(true)
  }

  get closingTag(): string {
    if (this.empty) return ''
    const newline = this.newlineAfterClosingTag ? '\n' : ''
    return `</${this._tag}>${newline}`
  }

  get openingAndClosingTags(): [string, string] {
    return [this.openingTag, this.closingTag]
  }

  get classAttributeValue(): string {
    return this.classes.sort().join(' ')
  }

  get styleAttributeValue(): string {
    if (this.styles.size > 0) {
      const chunks: string[] = []
      this.styles.forEach((p: string, value: string) => {
        chunks.push(`${p}: ${escapeDblQuotes(value.trim())}`)
      })
      return chunks.join('; ')
    }
    return ""
  }

  get attributes(): { [name: string]: string } {
    return { ...this.otherAttrs, class: this.classAttributeValue, style: this.styleAttributeValue }
  }

  constructor(tagType: TagType, tag: string = 'tag', classes: string[] = [], styles: [[p: string, v: string]] | undefined = undefined) {
    if (tag) this.tag = tag
    if (classes) this.addClasses(classes)
    if (styles && styles.length > 0) {
      styles.forEach(([p, v]) => {
        this.setStyleProperty(p, v)
      })
    }
    if (tagType) this.tagType = tagType
  }

  attributeValue(name: string): string {
    const n = name.trim()
    if (name === 'class') return this.classAttributeValue
    if (name === 'style') return this.styleAttributeValue
    return this.otherAttrs[name]
  }

  addClass(c: string): void {
    const _c = (c || '').trim()
    if (_c.length > 0 && this.classes.indexOf(_c) <= 0) this.classes.push(_c)
  }

  addClasses(cc: string[]): void {
    if (cc) {
      cc.forEach(c => {
        this.addClass(c)
      })
    }
  }

  removeClass(rc: string): void {
    this.classes = this.classes.filter(c => c !== rc)
  }

  setAttribute(name: string, value: string): void {
    if (!value) return
    if (name === 'class') {
      this.addClasses(value.split(/ +/))
    } else if (name === 'style') {
      value.split(/\s*;\s*/).forEach(chunk => {
        const index = chunk.indexOf(':')
        if (index > 0) {
          this.setStyleProperty(chunk.substring(0, index - 1), chunk.substring(index + 1))
        }
      })
    } else {
      this.otherAttrs[name] = value
    }
  }

  setAttributeIfNonEmpty(a: string, value: string | number): void {
    if (isNumber(value)) this.setAttribute(a, value.toString())
    else if (value && value.length > 0) this.setAttribute(a, value)
  }

  setStyleProperty(p: string, value: string): void {
    this.styles = this.styles.update(p.trim(), value)
  }

  tiptapRenderHTML(attributes = {}): any[] {
    const ret: any[] = [this.tag, mergeAttributes(this.attributes, attributes)]
    if (!this.empty) ret.push(0)
    return ret
  }
}

export default HtmlTagBuilder
import { NodeType, Node as ProsemirrorNode, Schema } from '@tiptap/pm/model'
import { isArray, isBoolean, isNumber, isObject, isString } from 'lodash'
import {
  MetaValueName,
  NODE_NAME_META_BLOCKS,
  NODE_NAME_META_BOOL,
  NODE_NAME_META_INLINES,
  NODE_NAME_META_LIST,
  NODE_NAME_META_MAP,
  NODE_NAME_META_MAP_ENTRY,
  NODE_NAME_META_STRING,
  NODE_NAME_PARAGRAPH
} from '../../common'
import { textNode } from './nodeTemplates'

const DEFAULT_STRING_META_VALUE = NODE_NAME_META_INLINES // NODE_NAME_META_STRING

export function metaValueNameToNodeType(schema: Schema, metaType: MetaValueName): NodeType | undefined {
  let nodeTypeName: string | undefined
  switch (metaType) {
    case 'MetaInlines':
      nodeTypeName = NODE_NAME_META_INLINES
      break
    case 'MetaString':
      nodeTypeName = NODE_NAME_META_STRING
      break
    case 'MetaMap':
      nodeTypeName = NODE_NAME_META_MAP
      break
    case 'MetaList':
      nodeTypeName = NODE_NAME_META_LIST
      break
    case 'MetaBlocks':
      nodeTypeName = NODE_NAME_META_BLOCKS
      break
    case 'MetaBool':
      nodeTypeName = NODE_NAME_META_BOOL
      break
    default:
      nodeTypeName = undefined
  }
  return nodeTypeName ? schema.nodes[nodeTypeName] : undefined
}

export function metaValueNameToNodeTypeName(schema: Schema, metaType: MetaValueName): string | undefined {
  const nodeType = metaValueNameToNodeType(schema, metaType)
  return nodeType && nodeType?.name
}

function stringMetaValue(schema: Schema, value: string, metaType?: MetaValueName): ProsemirrorNode {
  let nodeTypeName: string = DEFAULT_STRING_META_VALUE
  switch (metaType) {
    case 'MetaInlines':
      nodeTypeName = NODE_NAME_META_INLINES
      break
    case 'MetaString':
      nodeTypeName = NODE_NAME_META_STRING
      break
  }
  return schema.nodes[nodeTypeName]?.create(null, textNode(schema, value))
}

function arrayToParasMetaBlocks(schema: Schema, lines: string[]): ProsemirrorNode | null {
  const paragraphType = schema.nodes[NODE_NAME_PARAGRAPH]
  if (paragraphType) {
    const paras = lines.map(l => paragraphType.create(null, textNode(schema, l))).filter(p => !!p)
    return schema.nodes[NODE_NAME_META_BLOCKS].create(null, paras)
  }
  return null
}

/**
 * Create a MetaValue node from an object (used for CustomMetadata default values).
 * @param schema 
 * @param obj 
 * @param metaType the expected type of `MetaValue`.
 * @returns 
 */
export function anyToMetaValue(schema: Schema, obj: any, metaType?: MetaValueName): ProsemirrorNode | null {
  let node: ProsemirrorNode | null = null
  const nodes = schema.nodes
  if (isNumber(obj)) {
    node = stringMetaValue(schema, obj.toString(), metaType)
  } else if (isString(obj)) {
    const containsNewlines = obj.indexOf('\n') >= 0 || obj.indexOf('\r') >= 0
    if (containsNewlines && (!metaType || metaType === 'MetaBlocks')) {
      const paragraphType = nodes[NODE_NAME_PARAGRAPH]
      if (paragraphType) {
        const lines = obj.split(/(\n|\r\n|\r)/)
        node = arrayToParasMetaBlocks(schema, lines)
      }
    } else {
      node = stringMetaValue(schema, obj, metaType)
    }
  } else if (isBoolean(obj) && (!metaType || metaType === 'MetaBool')) {
    node = nodes[NODE_NAME_META_BOOL].create({ value: obj ? 'True' : 'False' })
  } else if (isArray(obj)) {
    if (!metaType || metaType === 'MetaList') {
      const list = obj.map(o => anyToMetaValue(schema, o))
      if (list.every(o => o !== null))
        node = nodes[NODE_NAME_META_LIST].create(null, list)
    } else if (metaType === 'MetaBlocks' && obj.every(o => isString(o))) {
      node = arrayToParasMetaBlocks(schema, obj)
    }
  } else if (isObject(obj) && (!metaType || metaType === 'MetaMap')) {
    const entries = Object.entries(obj).map(([key, value]) => {
      const metavalue = anyToMetaValue(schema, value)
      return metavalue ? nodes[NODE_NAME_META_MAP_ENTRY].create({ text: key }, metavalue) : null
    })
    if (entries.every(e => e !== null)) {
      node = nodes[NODE_NAME_META_MAP].create(null, entries)
    }
  }
  return node
}
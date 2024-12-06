import { Node } from '@tiptap/pm/model';
import {
  Attr,
  Block,
  BlockContainer,
  Div,
  Inline,
  InlineContainer,
  Pandoc,
  PandocContainer,
  Para,
  SimpleTable,
} from '../pandoc';

export type NodeToPandoc = (
  node: Node,
  conversion: PandocConversion
) => boolean;
export type TextNodeToPandocInlines = (
  node: Node,
  conversion: PandocConversion
) => Inline[];

export class PandocConversion {
  doc: Pandoc;
  private stack: PandocContainer[];

  constructor(public readonly pandocTypesVersion: number = 1.2) {
    this.doc = Pandoc.empty();
    this.doc.isStandalone = true;
    this.stack = [this.doc];
  }

  get usingOldTables() {
    return this.pandocTypesVersion <= 1.2;
  }

  get depth() {
    return this.stack.length - 1;
  }

  set depth(depth: number) {
    if (depth < 0) throw new Error(`You can't set a depth < 0!`);
    if (depth > this.stack.length - 1) new Error(`You can only reduce depth!`);
    while (this.stack.length > depth + 1) this.stack.pop();
  }

  get hook() {
    const ca = this.stack;
    return ca[ca.length - 1];
  }

  get hookParent(): PandocContainer | undefined {
    const ca = this.stack;
    if (ca.length > 1) return ca[ca.length - 2];
    return undefined;
  }

  isHookBlockContainer(): boolean {
    return !!this.hook.appendBlock;
  }

  isHookInlineContainer(): boolean {
    return !!this.hook.appendInline;
  }

  get currentParaStyle(): string | undefined {
    const hook = this.hook;
    const div = hook instanceof Div ? hook : this.hookParent;
    if (div && div instanceof Div && div.isCustomStyle())
      return div.customStyle;
    return undefined;
  }

  appendInlines(inlines: Inline[]): void {
    const hook = this.isHookInlineContainer() && (this.hook as InlineContainer);
    if (hook) {
      inlines.forEach((inline) => {
        hook.appendInline(inline);
      });
    } else {
      throw new Error('The head of the stack is not a container of Inlines');
    }
  }

  appendBlock(block: Block): void {
    const hook = this.hook;
    if (this.isHookBlockContainer()) {
      (hook as BlockContainer).appendBlock(block);
    } else {
      throw new Error('The head of the stack is not a container of Blocks');
    }
  }

  pushBlock(block: Block | PandocContainer): void {
    this.appendBlock(block);
    this.stack.push(block as PandocContainer);
  }

  pushNewPara(style?: string) {
    const currentStyle = this.currentParaStyle;
    if (currentStyle && currentStyle !== style) {
      this.stack.pop();
    }
    if (style) {
      const div = new Div(
        Attr.from({ attributes: { 'custom-style': style } }),
        []
      );
      this.pushBlock(div);
    }
    const para = Para.from('');
    this.pushBlock(para);
  }

  isInDivWithClass(cname: string): boolean {
    return !!this.stack
      .reverse()
      .find(
        (container) => container instanceof Div && container.hasClass(cname)
      );
  }

  itemsOnStack() {
    return this.stack.map((container, i) => {
      if (i === 0) {
        return 'Pandoc';
      } else if (container instanceof Div) {
        return `${container.name}${container.attr.classes.map((c) => '.' + c)}`;
      } else {
        return container.name;
      }
    });
  }

  pushTable() {
    if (this.usingOldTables) {
      this.pushBlock(SimpleTable.from({ body: [] }));
    } else {
      this.pushBlock(SimpleTable.from({ body: [] }));
    }
  }
}

export function exportNode(
  node: Node,
  convertNode: NodeToPandoc,
  convertTextNode: TextNodeToPandocInlines,
  conversion?: PandocConversion
): PandocConversion {
  const conv = conversion || new PandocConversion();
  const depth = conv.depth;
  const goDeeper = convertNode(node, conv);
  console.log(`node: ${node.type.name}, go deeper: ${goDeeper}`);
  console.log(conv.itemsOnStack());
  if (goDeeper && !node.isLeaf) {
    node.content.forEach((child) => {
      if (child.isText) {
        conv.appendInlines(convertTextNode(child, conv));
      } else {
        exportNode(child, convertNode, convertTextNode, conv);
      }
    });
  }
  conv.depth = depth;
  return conv;
}

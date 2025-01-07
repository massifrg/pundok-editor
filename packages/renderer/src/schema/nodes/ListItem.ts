import { ListItem as TiptapListItem, type ListItemOptions } from '@tiptap/extension-list-item';
import { NODE_NAME_LIST_ITEM } from '../../common';

export const ListItem = TiptapListItem.extend<ListItemOptions>({
  name: NODE_NAME_LIST_ITEM,
  content: 'block+',
});
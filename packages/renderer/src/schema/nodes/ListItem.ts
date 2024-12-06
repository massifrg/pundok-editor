import { ListItem as TiptapListItem, type ListItemOptions} from '@tiptap/extension-list-item';

export const ListItem = TiptapListItem.extend<ListItemOptions>({
  // content: 'plain | paragraph+'
  content: 'block+',
});
import { useQuasar } from 'quasar';
import {
  mdiAlertCircle,
  mdiArrowDown,
  mdiArrowUp,
  mdiChevronLeft,
  mdiChevronRight,
  mdiFileDocumentPlus,
  mdiFilePdfBox,
  mdiFileStarFourPoints,
  mdiImageCheck,
  mdiImageCheckOutline,
  mdiMenuDown,
  mdiOctagramMinus,
  mdiOctagramMinusOutline,
  mdiOctagramPlus,
  mdiOctagramPlusOutline,
  mdiPageFirst,
  mdiPageLast,
  mdiPlay,
  mdiContentSavePlus,
} from '@quasar/extras/mdi-v7/index.js';

import { commonIcons } from '../../common';

export const icons: Record<string, string> = {
  ...commonIcons,
  add_class: mdiOctagramPlus,
  add_custom_class: mdiOctagramPlusOutline,
  add_document: mdiFileDocumentPlus,
  arrow_upward: mdiArrowUp,
  arrow_downward: mdiArrowDown,
  arrow_drop_down: mdiMenuDown,
  chevron_left: mdiChevronLeft,
  chevron_right: mdiChevronRight,
  file_pdf_box: mdiFilePdfBox,
  first_page: mdiPageFirst,
  image_check: mdiImageCheck,
  image_check_outline: mdiImageCheckOutline,
  last_page: mdiPageLast,
  play_arrow: mdiPlay,
  root_document: mdiFileStarFourPoints,
  remove_class: mdiOctagramMinus,
  remove_custom_class: mdiOctagramMinusOutline,
  save_copy: mdiContentSavePlus,
  warning: mdiAlertCircle,
};

export function setupQuasarIcons() {
  const $q = useQuasar();
  $q.iconMapFn = (iconName) => {
    const icon = icons[iconName];
    if (icon !== void 0) {
      return { icon: icon };
    }
  };
}

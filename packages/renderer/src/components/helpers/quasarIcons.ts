import { useQuasar } from 'quasar';
import {
  mdiAlertCircle,
  mdiArrowUp,
  mdiArrowDown,
  mdiChevronLeft,
  mdiChevronRight,
  mdiMenuDown,
  mdiPageFirst,
  mdiPageLast,
  mdiFilePdfBox,
  mdiPlay,
} from '@quasar/extras/mdi-v7/index.js';

const icons: Record<string, string> = {
  arrow_upward: mdiArrowUp,
  arrow_downward: mdiArrowDown,
  arrow_drop_down: mdiMenuDown,
  // taken from www.svgrepo.com (Meteor Line Interface Icons), made thinner with Inkscape
  character_style:
    'm 12.7,13.7 h 0.9 c 0.9,0 1.7,0.7 1.7,1.7 0,0.9 -0.8,1.6 -1.7,1.6 h -2.1 l -1.4,3.9 c -0.27,1 -1.23,1.3 -2.1,1 -0.88,-0.2 -1.35,-1.2 -1.03,-2 L 12.9,3.04 c 0.5,-1.5 2.6,-1.5 3.1,0 l 5.8,16.86 c 0.4,0.8 0,1.8 -1,2 -0.8,0.3 -1.8,0 -2,-1 L 14.4,8.68 Z m -7.61,7.2 c -0.3,1 -1.26,1.3 -2.14,1 -0.88,-0.2 -1.33,-1.2 -1.02,-2 L 7.81,3.27 C 8.11,2.39 9.07,1.94 9.94,2.24 10.8,2.56 11.3,3.52 11,4.4 Z',
  chevron_left: mdiChevronLeft,
  chevron_right: mdiChevronRight,
  code_block_tags:
    'M5.59 3.41L7 4.82L3.82 8L7 11.18L5.59 12.6L1 8L5.59 3.41M11.41 3.41L16 8L11.41 12.6L10 11.18L13.18 8L10 4.82L11.41 3.41M22 6V18C22 19.11 21.11 20 20 20H4C2.9 20 2 19.11 2 18V14H4V18H20V6H17.03V4H20C21.11 4 22 4.89 22 6Z',
  file_pdf_box: mdiFilePdfBox,
  first_page: mdiPageFirst,
  invoice_list:
    'M3 22V3H21V22L18 20L15 22L12 20L9 22L6 20L3 22M17 9V7H15V9H17M13 9V7H7V9H13M13 11H7V13H13V11M15 13H17V11H15V13Z',
  last_page: mdiPageLast,
  // taken from www.svgrepo.com (Meteor Line Interface Icons), made thinner with Inkscape
  paragraph_style:
    'm 6.27,1.93 c -2.59,0.2 -4.69,2.68 -4.5,5.28 -0.1,1.58 0,3.29 1.14,4.59 1.13,1.4 3.01,2 4.77,1.8 0.88,0 1.75,0 2.62,0 0,2.4 0,4.8 0,7.2 0.2,1.4 2.2,1.7 2.9,0.6 0.6,-0.9 0.2,-2 0.3,-3 0,-4.4 0,-8.87 0,-13.3 1.2,0 2.4,0 3.6,0 0,5.2 0,10.5 0,15.7 0.2,1.4 2.3,1.7 3,0.5 0.4,-0.9 0.1,-2 0.2,-3 0,-4.4 0,-8.8 0,-13.2 1.2,0.13 2.2,-1.42 1.4,-2.45 C 21,1.53 19.6,2 18.5,1.9 c -4.1,0 -8.2,-0 -12.23,0 z M 6.78,5.1 c 1.17,0 2.35,0 3.52,0 0,1.77 0,3.53 0,5.3 C 8.95,10.3 7.58,10.5 6.24,10.3 5.26,10 4.81,8.96 4.97,8.01 4.92,7.1 4.87,5.95 5.77,5.4 6.07,5.21 6.42,5.1 6.78,5.1 Z',
  play_arrow: mdiPlay,
  warning: mdiAlertCircle,
  whole_word:
    'M6,11A2,2 0 0,1 8,13V17H4A2,2 0 0,1 2,15V13A2,2 0 0,1 4,11H6M4,13V15H6V13H4M20,13V15H22V17H20A2,2 0 0,1 18,15V13A2,2 0 0,1 20,11H22V13H20M12,7V11H14A2,2 0 0,1 16,13V15A2,2 0 0,1 14,17H12A2,2 0 0,1 10,15V7H12M12,15H14V13H12V15Z' +
    'M3 15H5V19H19V15H21V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V15Z',
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

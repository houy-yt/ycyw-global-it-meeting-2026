import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';

/* ── Font Awesome ── */
import { library } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import {
  faPenToSquare,
  faPaperPlane,
  faThumbtack,
  faHeart as fasHeart,
  faCommentDots,
  faFilePen,
  faWandMagicSparkles,
  faXmark,
  faCalendarDays,
  faUsers,
  faCamera,
  faRobot,
  faShieldHalved,
  faGlobe,
  faLock,
  faChartBar,
  faCloud,
  faIdCard,
  faGears,
  faBuilding,
  faScrewdriverWrench,
  faChartLine,
  faPlus,
  faLink,
  faVideo,
  faRightFromBracket,
  faGear,
  faStar,
  faCirclePlus,
  faArrowRight,
  faArrowUpRightFromSquare,
  faLocationDot,
  faMap,
  faMapLocationDot,
  faChevronUp,
  faChevronRight,
  faCircleRight,
} from '@fortawesome/free-solid-svg-icons';
import {
  faHeart as farHeart,
  faComment as farComment,
} from '@fortawesome/free-regular-svg-icons';

library.add(
  faPenToSquare,
  faPaperPlane,
  faThumbtack,
  fasHeart,
  farHeart,
  faCommentDots,
  farComment,
  faFilePen,
  faWandMagicSparkles,
  faXmark,
  faCalendarDays,
  faUsers,
  faCamera,
  faRobot,
  faShieldHalved,
  faGlobe,
  faLock,
  faChartBar,
  faCloud,
  faIdCard,
  faGears,
  faBuilding,
  faScrewdriverWrench,
  faChartLine,
  faPlus,
  faLink,
  faVideo,
  faRightFromBracket,
  faGear,
  faStar,
  faCirclePlus,
  faArrowRight,
  faArrowUpRightFromSquare,
  faLocationDot,
  faMap,
  faMapLocationDot,
  faChevronUp,
  faChevronRight,
  faCircleRight,
);

import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';
import './assets/main.css';

const app = createApp(App);

app.component('font-awesome-icon', FontAwesomeIcon);
app.use(createPinia());
app.use(router);
app.use(ElementPlus);

// hydrate auth from localStorage before mount
const auth = useAuthStore();
auth.hydrate();

app.mount('#app');

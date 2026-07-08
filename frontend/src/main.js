import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

/* ── Font Awesome: bulk-import all icons ── */
import { library } from '@fortawesome/fontawesome-svg-core';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fab } from '@fortawesome/free-brands-svg-icons';

library.add(fas, far, fab);

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

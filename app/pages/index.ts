import { defineComponent, h } from 'vue';
import HomePage from './home.vue';

export default defineComponent({
  name: 'IndexPage',
  setup() {
    return () => h(HomePage);
  },
});

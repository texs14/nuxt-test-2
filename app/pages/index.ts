import { defineComponent, h, resolveComponent } from 'vue';

export default defineComponent({
  name: 'IndexPage',
  setup() {
    return () => h('section', { class: 'home' }, []);
  },
});

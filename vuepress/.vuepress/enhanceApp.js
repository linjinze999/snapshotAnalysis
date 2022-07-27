import Vuex from 'vuex';
import store from './store'
import Element from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';

export default ({ Vue, options, router, isServer }) => {
  Vue.use(Vuex);
  options.store = new Vuex.Store(store);
  Vue.use(Element);
};

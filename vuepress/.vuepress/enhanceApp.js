import Vuex from 'vuex';
import store from './store'
import Element from 'element-ui';
import 'element-ui/lib/theme-chalk/index.css';
// import "../../src/index";


export default ({ Vue, options, router, isServer }) => {
  Vue.use(Vuex);
  Vue.mixin({store});
  options.store = store;
  Vue.use(Element);
};

export default {
  namespaced: true,
  state: () => {
    list: [{name: "test.snapshot"}]
  },
  getters: {
    fileList: (state, getters, rootState) => {
      return [];
    }
  },
  mutations: {
    addSnapshot (state, { id }) {
      state.list.push({
        id,
        quantity: 1
      })
    }
  },
  actions: {
    checkout ({ commit, state }, products) {
      const savedCartItems = [...state.items]
      // empty cart
      commit('addSnapshot', { items: [] })
    }
  },
}

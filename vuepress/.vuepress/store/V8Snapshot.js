import V8SnapshotExample from "../example/kg_qq_com.js"
import { V8Snapshot } from "../../../dist/index"

export default {
  namespaced: true,
  state: () => {
    return {
      snapshotList: [
        {
          name: "示例.heapsnapshot",
          snapshot: new V8Snapshot({text: JSON.stringify(V8SnapshotExample)})
        }
      ]
    }
  },
  getters: {
    fileListTemp: (state, getters, rootState) => {
      return [];
    }
  },
  mutations: {
    addSnapshot (state, { id }) {
      state.snapshotList.push({
        id,
        quantity: 1
      })
    }
  },
  actions: {
    addSnapshot ({ commit, state }, products) {
      commit('addSnapshot', { items: [] })
    }
  },
}

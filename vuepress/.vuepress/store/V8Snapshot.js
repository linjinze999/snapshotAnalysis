import V8SnapshotExample from "../example/kg_qq_com.js"
import { V8Snapshot } from "../../../dist/index"
import { Message } from 'element-ui';

export default {
  namespaced: true,
  state: () => {
    return {
      snapshotList: [
        {
          name: "示例.heapsnapshot",
          snapshot: new V8Snapshot({text: JSON.stringify(V8SnapshotExample)})
        }
      ],
      activeIndex: 0
    }
  },
  getters: {
    fileListTemp: (state, getters, rootState) => {
      return [];
    }
  },
  mutations: {
    addSnapshot (state, { snapshotList }) {
      state.snapshotList = state.snapshotList.concat(snapshotList);
    }
  },
  actions: {
    addSnapshot ({ commit, state }, fileList) {
      const snapshotList = fileList.map(file => {
        try{
          return {
            name: file.name,
            snapshot: new V8Snapshot({text:file.text})
          }
        }catch (e){
          Message.error(`解析《${file.name}》出错`)
        }
        return null;
      }).filter(v => v);
      commit('addSnapshot', { snapshotList })
    }
  },
}

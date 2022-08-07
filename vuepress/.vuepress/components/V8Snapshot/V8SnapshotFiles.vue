<template>
  <div class="snapshot-list">
    <input type="file" accept=".heapsnapshot" ref="input" class="input" @change="onInput" />
    <div
        v-for="item in snapshotList"
        :key="item.name"
        class="item"
        :class="{active: item.id === activeSnapshot.id}"
        v-loading="item.progress < 1"
        :element-loading-text="item.progressText"
        @click="updateActive(item)"
    >
      {{item.name}}
    </div>
    <i class="el-icon-plus item add" @click="showInput"></i>
    {{snapshotList[0].snapshot.calculateStatistics()}}
  </div>
</template>

<script>
import { createNamespacedHelpers } from 'vuex';
import { readFiles } from '../../utils/files';
const { mapState, mapGetters, mapActions } = createNamespacedHelpers('V8Snapshot')

export default {
  name: 'V8SnapshotFiles',
  data() {
    return {
      dialogImageUrl: '',
      dialogVisible: false,
      disabled: false
    };
  },
  computed: {
    ...mapState({
      snapshotList: state => state.snapshotList,
    }),
    ...mapGetters(["activeSnapshot"])
  },
  methods: {
    showInput(){
      this.$refs.input.dispatchEvent(new MouseEvent('click'));
    },
    onInput(){
      readFiles(this.$refs.input.files).then(fileList => {
        this.addSnapshot(fileList);
      }).catch(() => {
        this.$message.error('读取文件出错');
      })
    },
    onRemove(file) {
      console.log(file);
    },
    updateActive(snapshot){
      this.updateActiveSnapshot(snapshot);
    },
    ...mapActions(["addSnapshot", "updateActiveSnapshot"])
  }
};
</script>

<style scoped lang="scss">
.snapshot-list{
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;

  .input {
    display: none;
  }
  .item {
    border: 1px dashed #c0ccda;
    border-radius: 6px;
    box-sizing: border-box;
    width: 148px;
    height: 148px;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 5px;
    padding: 10px;
    word-break: break-all;

    &:hover, &:focus, &.active{
      border-color: #409eff;
      color: #409eff;
    }
  }

  .add{
    font-size: 28px;
    color: #8c939d;
  }
}
</style>

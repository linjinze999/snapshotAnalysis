<template>
  <div>
    测试：
    {{snapshotList.length}}
    {{snapshotList[0].snapshot.calculateStatistics()}}
  </div>
</template>

<script>
import { createNamespacedHelpers } from 'vuex';
const { mapState, mapActions } = createNamespacedHelpers('V8Snapshot')

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
      snapshotList: state => state.snapshotList
    })
  },
  methods: {
    handleRemove(file) {
      console.log(file);
    },
    handlePictureCardPreview(file) {
      this.dialogImageUrl = file.url;
      this.dialogVisible = true;
    },
    handleDownload(file) {
      console.log(file);
    }
  }
};
</script>

<style scoped lang="scss">

</style>

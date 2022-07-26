<template>
  <div>
    测试：
    {{list.length}}
  </div>
</template>

<script>
import { mapState, mapActions } from 'vuex';

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
      list: state => state.V8Snapshot.list
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

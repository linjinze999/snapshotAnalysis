module.exports = {
  dest: 'docs',
  base: '/snapshotAnalysis/',
  locales: {
    '/': {
      lang: 'zh-CN',
      title: '内存分析',
      description: 'snapshot内存分析工具'
    }
  },
  head: [],
  plugins: [],
  themeConfig: {
    repo: 'linjinze999/snapshotAnalysis',
    docsRepo: 'linjinze999/snapshotAnalysis',
    docsDir: 'vuepress',
    // editLinks: true,
    // sidebarDepth: 0,
    locales: {
      '/': {
        label: '简体中文',
        selectText: '选择语言',
        editLinkText: '帮我改进此页',
        lastUpdated: '上次更新',
        nav: [
          {
            text: 'V8(Chrome)',
            link: '/V8/',
          },
          {
            text: 'JSC(Safari)',
            link: '/JSC/',
          }
        ],
        sidebar: {
          '/V8/': [
            {
              title: '堆快照',
              collapsable: false,
              children: [
                'snapshot/summary',
                'snapshot/comparison',
                'snapshot/containment',
                'snapshot/statistics',
              ]
            },
            {
              title: '时间轴上的分配插桩',
              collapsable: false,
              children: [
                '',
              ]
            },
            {
              title: '分配采样',
              collapsable: false,
              children: [
                '',
              ]
            },
          ]
        }
      }
    }
  }
};

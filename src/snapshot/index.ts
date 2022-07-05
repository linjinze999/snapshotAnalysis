import * as fs from "fs";
import {SnapshotInfo, SnapshotInfoNode} from "./snapshotInfo";
import {SnapshotEdgeTypes, SnapshotNodeTypes} from "./snapshotTypes";

export interface SnapshotOptions{
  text: string;
}

export class Snapshot {
  constructor(options: SnapshotOptions) {
    this.options = Object.assign({}, this.options, Snapshot.DEFAULT_OPTIONS, options);
    this.snapshot_info = new SnapshotInfo({text: this.options.text});
  }

  static DEFAULT_OPTIONS: SnapshotOptions = {text: ""};
  private readonly options: SnapshotOptions = {} as any;
  public snapshot_info: SnapshotInfo;

  // 统计数据
  public calculateStatistics = () => {
    const size = {
      total: 0, // 总计
      native: 0, // 类型化数组
      code: 0, // 代码
      string: 0, // 字符串
      array: 0, // js数组
      system: 0 // 系统对象
    }
    let nodeSize: number;
    this.snapshot_info.node_list.forEach(node => {
      nodeSize = node.self_size as number;
      size.total += nodeSize;
      if(node.distance >= SnapshotInfo.BASE_SYSTEM_DISTANCE){
        size.system += nodeSize;
      } else if(node.type === SnapshotNodeTypes.native){
        size.native += nodeSize;
      } else if(node.type === SnapshotNodeTypes.code){
        size.code += nodeSize;
      } else if(([SnapshotNodeTypes.string, SnapshotNodeTypes.concatenated_string, SnapshotNodeTypes.sliced_string]).includes(node.type as SnapshotNodeTypes)){
        size.string += nodeSize;
      } else if(node.name === "Array"){
        size.array += this.calculateArraySize(node);
      }
    });
    return size
  }

  public calculateArraySize = (node: SnapshotInfoNode) => {
    let size = node.self_size as number;
    this.snapshot_info.edges[node.id]?.some(edge => {
      if(edge.type !== SnapshotEdgeTypes.internal){
        return false;
      }
      if(edge.name_or_index !== 'elements'){
        return false;
      }
      const node_to = this.snapshot_info.nodes[edge.to_node];
      if (this.snapshot_info.edges_to[edge.to_node]?.length === 1) {
        size += (node_to.self_size as number);
      }
      return true;
    })
    return size;
  }
}

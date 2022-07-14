import {
    V8Snapshot,
    V8SnapshotEdgeFields,
    V8SnapshotEdgeTypes,
    V8SnapshotNodeFields,
    V8SnapshotNodeTypes
} from "./V8SnapshotTypes";

export interface V8SnapshotInfoOptions {
    text: string;
}

enum V8SnapshotInfoNodeFields {
    retained_size = "retained_size",
    distance = "distance",
    flag = "flag"
}

enum V8SnapshotInfoEdgeFields {
    from_node = "from_node"
}

export type V8SnapshotInfoNode = Record<V8SnapshotNodeFields | V8SnapshotInfoNodeFields, number | string>;
export type V8SnapshotInfoEdge = Record<V8SnapshotEdgeFields | V8SnapshotInfoEdgeFields, number | string>;

// V8Snapshot基础信息
export class V8SnapshotInfo {
    constructor(options: V8SnapshotInfoOptions) {
        this.init(options.text);
    }

    public heap: V8Snapshot = null as any;
    public node_list: V8SnapshotInfoNode[] = []; // [node_1, node_2, ...]
    public edge_list: V8SnapshotInfoEdge[] = []; // [edge_1, edge_2, ...]
    public nodes: Record<number | string, V8SnapshotInfoNode> = {}; // {[node_id]: node_info}
    public edges: Record<number | string, V8SnapshotInfoEdge[] | undefined> = {}; // {[from_node_id]: [to_node1,to_node2]}
    public edges_to: Record<number | string, V8SnapshotInfoEdge[] | undefined> = {}; // {[to_node_id]: [from_node1,from_node2]}
    public node_fields_idx: Record<V8SnapshotNodeFields, number> = {} as any;
    public edge_fields_idx: Record<V8SnapshotEdgeFields, number> = {} as any;
    public node_field_count: number = 0;
    public edge_fields_count: number = 0;
    public root_id = 1;
    public nodeId2PostOrderIndex: Record<number | string, number> = {};
    public postOrderIndex2NodeId: Uint32Array = new Uint32Array();
    public dominatorsTree: Record<number, number> = {};
    static ROOT_NODE_ID = 1;
    static NO_RETAINED_SIZE = -1;
    static NO_DISTANCE = 0;
    static BASE_SYSTEM_DISTANCE = 100000000;
    static NODE_FLAGS = {        // bit flags
        canBeQueried: 1,
        detachedDOMTreeNode: 2,
        pageObject: 4
    }

    // 初始化：分析V8Snapshot
    init = (text: string) => {
        try{
            this.heap = JSON.parse(text);
        } catch (e) {
            console.error("[V8SnapshotInfo] format snapshot error: ", e);
            throw new Error("could not format snapshot string")
        }
        if(!this.heap){
            return;
        }
        this.root_id = V8SnapshotInfo.ROOT_NODE_ID;
        this.initFieldsIndex();
        this.initNodes();
        this.initEdges();
        this.calculateFlags();
        this.buildPostOrderIndex();
        this.buildDominatorTree();
        this.initDistance();
        this.calculateRetainedSizes();
    }

    // 初始化：记录fields序号
    initFieldsIndex = () => {
        this.node_field_count = this.heap.snapshot.meta.node_fields.length;
        this.edge_fields_count = this.heap.snapshot.meta.edge_fields.length;
        this.heap.snapshot.meta.node_fields.forEach((node_field, idx) => {
            this.node_fields_idx[node_field] = idx;
        });
        this.heap.snapshot.meta.edge_fields.forEach((edge_field, idx) => {
            this.edge_fields_idx[edge_field] = idx;
        });
    }

    // 初始化：Node信息
    initNodes = () => {
        const node_count = this.heap.snapshot.node_count;
        let node: V8SnapshotInfoNode;
        for (let i = 0; i < node_count; ++i) {
            node = this.getNode(i * this.node_field_count);
            this.node_list.push(node);
            this.nodes[node.id as number] = node;
        }
    }

    // 获取node
    getNode = (node_start: number): V8SnapshotInfoNode => {
        const node_field = this.heap.snapshot.meta.node_fields;
        const node: Partial<V8SnapshotInfoNode> = {
            retained_size: V8SnapshotInfo.NO_RETAINED_SIZE,
            distance: V8SnapshotInfo.NO_DISTANCE,
            flag: 0
        };
        for (let i = 0; i < this.node_field_count; ++i) {
            // todo name: concatenated string
            node[node_field[i]] = this.getNodeField(node_start, i);
        }
        node.retained_size = node.self_size;
        if (node.type === V8SnapshotNodeTypes.native && (node.name as string).startsWith('Detached ')) {
            (node.flag as number) |= V8SnapshotInfo.NODE_FLAGS.detachedDOMTreeNode;
        }
        return node as V8SnapshotInfoNode;
    }

    // 获取node某个field值
    getNodeField = (node_start: number, node_field_idx: number) => {
        const value = this.heap.nodes[node_start + node_field_idx];
        const type = this.heap.snapshot.meta.node_types[node_field_idx];
        if (type === V8SnapshotNodeTypes.string) return this.heap.strings[value];
        if (type === V8SnapshotNodeTypes.number) return value;
        if (Array.isArray(type)) return type[value];
        throw new Error("unsupported node field type: " + type);
    }

    // 初始化：edges信息
    initEdges = () => {
        let edge_start = 0;
        let edge: V8SnapshotInfoEdge;
        let from_node_id: number;
        this.node_list.forEach(node => {
            from_node_id = node.id as number;
            for (let j = 0; j < node.edge_count; ++j) {
                edge = this.getEdge(edge_start, from_node_id) as V8SnapshotInfoEdge;
                // edge list
                this.edge_list.push(edge);
                // edge from map
                this.edges[from_node_id] = this.edges[from_node_id] || [];
                this.edges[from_node_id]!.push(edge);
                // edge to map
                this.edges_to[edge.to_node] = this.edges_to[edge.to_node] || [];
                this.edges_to[edge.to_node]!.push(edge);
                edge_start += this.edge_fields_count;
            }
        });
    }

    // 获取edge
    getEdge = (edge_start: number, from_node: number): V8SnapshotInfoEdge => {
        const edge_field = this.heap.snapshot.meta.edge_fields;
        const edge: Partial<V8SnapshotInfoEdge> = {
            from_node
        };
        for (let i = 0; i < this.edge_fields_count; ++i) {
            edge[edge_field[i]] = this.getEdgeField(edge_start, i);
        }
        return edge as V8SnapshotInfoEdge;
    }

    // 获取edge的field
    getEdgeField = (edge_start: number, field_index: number) => {
        const value = this.heap.edges[edge_start + field_index];
        const type = this.heap.snapshot.meta.edge_types[field_index];
        if (type === V8SnapshotEdgeTypes.string_or_number) {
            return this.heap.strings[value];
        } else if (type === V8SnapshotEdgeTypes.node) {
            return this.getNodeField(value, this.node_fields_idx[V8SnapshotNodeFields.id]);
        } else if (Array.isArray(type)) {
            return type[value]
        }
        throw new Error("unsupported edge field type: " + type)
    }

    // 初始化：对象自身大小加上它依赖链路上的所有对象的自身大小（Shallow size）之和
    // calculateRetainedSizes
    calculateRetainedSizes = () => {
        const nodeCount = this.node_list.length;
        const dominatorsTree = this.dominatorsTree;
        for (let postOrderIndex = 0; postOrderIndex < nodeCount - 1; ++postOrderIndex) {
            const nodeId = this.postOrderIndex2NodeId[postOrderIndex];
            const dominatorNodeId = dominatorsTree[nodeId];
            (this.nodes[dominatorNodeId].retained_size as number) += (this.nodes[nodeId].retained_size as number);
        }
    }

    // 初始化：距离
    initDistance = () => {
        const root_node = this.nodes[this.root_id];
        const nodesToVisit = new Array(this.node_list.length);
        let nodesToVisitLength = 0;
        let node_to: V8SnapshotInfoNode;
        // BFS for user root objects.
        this.edges[root_node.id]?.forEach(edge => {
            node_to = this.nodes[edge.to_node];
            if(node_to.type !== V8SnapshotNodeTypes.synthetic){
                (node_to.distance = 1);
                nodesToVisit[nodesToVisitLength++] = node_to;
            }
        });
        this.setNodeChildDistance(nodesToVisit, nodesToVisitLength);
        // BFS for objects not reached from user roots.
        root_node.distance = nodesToVisitLength > 0 ? V8SnapshotInfo.BASE_SYSTEM_DISTANCE : 0;
        nodesToVisit[0] = root_node;
        nodesToVisitLength = 1;
        this.setNodeChildDistance(nodesToVisit, nodesToVisitLength);
    }

    // 设置node距离
    setNodeChildDistance = (nodesToVisit: V8SnapshotInfoNode[], nodesToVisitLength: number) => {
        let index = 0;
        let node: V8SnapshotInfoNode;
        let node_to: V8SnapshotInfoNode;
        while (index < nodesToVisitLength) {
            node = nodesToVisit[index++];
            this.edges[node.id]?.forEach(edge => {
                node_to = this.nodes[edge.to_node];
                if(edge.type === V8SnapshotEdgeTypes.weak
                    || node_to.distance !== V8SnapshotInfo.NO_DISTANCE
                    || !this.nodesDistanceFilter(node_to, edge)){
                    return;
                }
                node_to.distance = (node.distance as number) + 1;
                nodesToVisit[nodesToVisitLength++] = node_to;
            })
        }
    }

    // node距离过滤
    nodesDistanceFilter = (node: V8SnapshotInfoNode, edge: V8SnapshotInfoEdge) => {
        if (node.type === V8SnapshotNodeTypes.hidden) {
            return edge.name_or_index !== 'sloppy_function_map' || node.name !== 'system / NativeContext';
        }
        if (node.type === V8SnapshotNodeTypes.array) {
            if (node.name !== '(map descriptors)') {
                return true;
            }
            const index = parseInt(edge.name_or_index as string, 10);
            return index < 2 || (index % 3) !== 1;
        }
        return true;
    }

    // 节点标记
    private calculateFlags = () => {
        this.markPageOwnedNodes();
    }

    // 标记node节点是有页面内对象
    private markPageOwnedNodes() {
        const flag = V8SnapshotInfo.NODE_FLAGS.pageObject;
        this.edges[this.root_id]?.forEach(edge => {
            if(edge.type === V8SnapshotEdgeTypes.element){
                // isDocumentDOMTreesRoot
                if(this.nodes[edge.to_node]?.type === V8SnapshotNodeTypes.synthetic && this.nodes[edge.to_node].name === "(Document DOM trees)"){
                    (this.nodes[edge.to_node].flag as number) |= flag;
                    this.markPageOwnedNodesByNodeId(edge.to_node as number, flag);
                }
            } else if (edge.type === V8SnapshotEdgeTypes.shortcut){
                (this.nodes[edge.to_node].flag as number) |= flag;
                this.markPageOwnedNodesByNodeId(edge.to_node as number, flag);
            }
        });
    }

    // 标记node节点是有页面内对象
    private markPageOwnedNodesByNodeId(nodeId: number, flag: number){
        this.edges[nodeId]?.forEach(edge => {
            const node_to = this.nodes[edge.to_node];
            if ((node_to.flag as number) & flag) {
                return;
            }
            if(edge.type === V8SnapshotEdgeTypes.weak){
                return;
            }
            (node_to.flag as number) |= flag;
            this.markPageOwnedNodesByNodeId(edge.to_node as number, flag);
        });
    }

    // 构建倒序序号
    buildPostOrderIndex = () => {
        const nodeCount = this.node_list.length;
        this.postOrderIndex2NodeId = new Uint32Array(nodeCount);

        const stackNodes = new Uint32Array(nodeCount);
        const visited = new Set();
        let postOrderIndex = 0;
        let stackTop = 0;
        stackNodes[0] = this.root_id;
        visited.add(this.root_id);

        let iteration = 0;
        let hasNew = false;
        while (true) {
            ++iteration;
            while (stackTop >= 0) {
                const node = this.nodes[stackNodes[stackTop]];
                hasNew = false;
                this.edges[node.id]?.forEach(edge => {
                    if (!this.isEssentialEdge(node.id as number, edge.type as V8SnapshotEdgeTypes)) {
                        return;
                    }
                    const childNode = this.nodes[edge.to_node];
                    if (visited.has(childNode.id)) {
                        return;
                    }
                    if(node.id !== this.root_id &&
                      ((childNode.flag as number) & V8SnapshotInfo.NODE_FLAGS.pageObject) &&
                      !((node.flag as number) & V8SnapshotInfo.NODE_FLAGS.pageObject)){
                        return;
                    }
                    hasNew = true;
                    ++stackTop;
                    stackNodes[stackTop] = edge.to_node as number;
                    visited.add(edge.to_node);
                })
                if(!hasNew) {
                    // Done with all the node children
                    this.nodeId2PostOrderIndex[node.id as number] = postOrderIndex;
                    this.postOrderIndex2NodeId[postOrderIndex++] = node.id as number;
                    --stackTop;
                }
            }

            if (postOrderIndex === nodeCount || iteration > 1) {
                break;
            }
            const errors = [
              `Heap snapshot: ${nodeCount - postOrderIndex} nodes are unreachable from the root. Following nodes have only weak retainers:`
            ];
            // Remove root from the result (last node in the array) and put it at the bottom of the stack so that it is
            // visited after all orphan nodes and their subgraphs.
            --postOrderIndex;
            stackTop = 0;
            stackNodes[0] = this.root_id;
            for (let i = 0; i < nodeCount; ++i) {
                const node = this.node_list[i];
                if (visited.has(node.id) || !this.hasOnlyWeakRetainers(node.id as number)) {
                    continue;
                }
                // Add all nodes that have only weak retainers to traverse their subgraphs.
                stackNodes[++stackTop] = node.id as number;
                visited.add(node.id);
                const retainers: string[] = [];
                this.edges_to[node.id as number]?.forEach(edge => {
                    const node_from = this.nodes[edge.from_node];
                    retainers.push(`${node_from.name}@${node_from.id}.${edge.name_or_index}`);
                })
                errors.push(`${node.name} @${node.id}  weak retainers: ${retainers.join(', ')}`);
            }
            console.warn(errors);
        }

        // If we already processed all orphan nodes that have only weak retainers and still have some orphans...
        if (postOrderIndex !== nodeCount) {
            const errors = ['Still found ' + (nodeCount - postOrderIndex) + ' unreachable nodes in heap snapshot:'];
            // Remove root from the result (last node in the array) and put it at the bottom of the stack so that it is
            // visited after all orphan nodes and their subgraphs.
            --postOrderIndex;
            for (let i = 0; i < nodeCount; ++i) {
                const node = this.node_list[i];
                if (visited.has(node.id)) {
                    continue;
                }
                errors.push(node.name + ' @' + node.id);
                // Fix it by giving the node a postorder index anyway.
                this.nodeId2PostOrderIndex[node.id] = postOrderIndex;
                this.postOrderIndex2NodeId[postOrderIndex++] = node.id as number;
            }
            this.nodeId2PostOrderIndex[this.root_id] = postOrderIndex;
            this.postOrderIndex2NodeId[postOrderIndex++] = this.root_id;
            console.warn(errors);
        }
    }

    // 基本必要edge
    isEssentialEdge = (nodeId: number, edgeType: V8SnapshotEdgeTypes) => {
        return edgeType !== V8SnapshotEdgeTypes.weak &&
          (edgeType !== V8SnapshotEdgeTypes.shortcut || nodeId === this.root_id);
    }

    // 上级只有weak
    private hasOnlyWeakRetainers = (nodeId: number) => {
        return !this.edges_to[nodeId]?.some(edge => {
          return edge.type !== V8SnapshotEdgeTypes.weak && edge.type !== V8SnapshotEdgeTypes.shortcut
        })
    }

    // 支配树（向上寻找包含node所有引用的父node）
    private buildDominatorTree = () => {
        const flag = V8SnapshotInfo.NODE_FLAGS.pageObject;
        const nodesCount = this.postOrderIndex2NodeId.length;
        const rootPostOrderedIndex = nodesCount - 1;
        const noEntry = nodesCount;
        const dominators = new Uint32Array(nodesCount);
        for (let i = 0; i < rootPostOrderedIndex; ++i) {
            dominators[i] = noEntry;
        }
        dominators[rootPostOrderedIndex] = rootPostOrderedIndex;

        // The affected array is used to mark entries which dominators
        // have to be racalculated because of changes in their retainers.
        const affected = new Uint8Array(nodesCount);
        let node: V8SnapshotInfoNode;

        // Mark the root direct children as affected.
        this.edges[this.root_id]?.forEach(edge => {
            if (!this.isEssentialEdge(this.root_id, edge.type as V8SnapshotEdgeTypes)) {
                return;
            }
            affected[this.nodeId2PostOrderIndex[edge.to_node]] = 1;
        });

        let changed = true;
        while (changed) {
            changed = false;
            for (let postOrderIndex = rootPostOrderedIndex - 1; postOrderIndex >= 0; --postOrderIndex) {
                if (affected[postOrderIndex] === 0) {
                    continue;
                }
                affected[postOrderIndex] = 0;
                // If dominator of the entry has already been set to root,
                // then it can't propagate any further.
                if (dominators[postOrderIndex] === rootPostOrderedIndex) {
                    continue;
                }
                node = this.nodes[this.postOrderIndex2NodeId[postOrderIndex]];
                const nodeFlag = ((node.flag as number) & flag);
                let newDominatorIndex: number = noEntry;
                let orphanNode = true;
                let node_from: V8SnapshotInfoNode;
                this.edges_to[node.id]?.some(edge => {
                    node_from = this.nodes[edge.from_node];
                    if (!this.isEssentialEdge(edge.from_node as number, edge.type as V8SnapshotEdgeTypes)) {
                        return false;
                    }
                    orphanNode = false;
                    const retainerNodeFlag = ((node_from.flag as number) & flag);
                    // We are skipping the edges from non-page-owned nodes to page-owned nodes.
                    // Otherwise the dominators for the objects that also were retained by debugger would be affected.
                    if (node_from.id !== this.root_id && nodeFlag && !retainerNodeFlag) {
                        return false;
                    }
                    let retanerPostOrderIndex: number = this.nodeId2PostOrderIndex[node_from.id];
                    if (dominators[retanerPostOrderIndex] !== noEntry) {
                        if (newDominatorIndex === noEntry) {
                            newDominatorIndex = retanerPostOrderIndex;
                        } else {
                            while (retanerPostOrderIndex !== newDominatorIndex) {
                                while (retanerPostOrderIndex < newDominatorIndex) {
                                    retanerPostOrderIndex = dominators[retanerPostOrderIndex];
                                }
                                while (newDominatorIndex < retanerPostOrderIndex) {
                                    newDominatorIndex = dominators[newDominatorIndex];
                                }
                            }
                        }
                        // If idom has already reached the root, it doesn't make sense
                        // to check other retainers.
                        if (newDominatorIndex === rootPostOrderedIndex) {
                            return true;
                        }
                    }
                    return false;
                })
                // Make root dominator of orphans.
                if (orphanNode) {
                    newDominatorIndex = rootPostOrderedIndex;
                }
                if (newDominatorIndex !== noEntry && dominators[postOrderIndex] !== newDominatorIndex) {
                    dominators[postOrderIndex] = newDominatorIndex;
                    changed = true;
                    const nodeId = this.postOrderIndex2NodeId[postOrderIndex];
                    this.edges[nodeId]?.forEach(edge => {
                        affected[this.nodeId2PostOrderIndex[edge.to_node]] = 1;
                    });
                }
            }
        }

        for (let postOrderIndex = 0, l = dominators.length; postOrderIndex < l; ++postOrderIndex) {
            const nodeId = this.postOrderIndex2NodeId[postOrderIndex];
            this.dominatorsTree[nodeId] = this.postOrderIndex2NodeId[dominators[postOrderIndex]];
        }
    }
}

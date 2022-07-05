import {Snapshot, SnapshotEdgeFields, SnapshotEdgeTypes, SnapshotNodeFields, SnapshotNodeTypes} from "./snapshotTypes";

export interface SnapshotInfoOptions {
    text: string;
}

enum SnapshotInfoNodeFields {
    retained_size = "retained_size",
    distance = "distance"
}

enum SnapshotInfoEdgeFields {
    from_node = "from_node"
}

export type SnapshotInfoNode = Record<SnapshotNodeFields | SnapshotInfoNodeFields, number | string>;
export type SnapshotInfoEdge = Record<SnapshotEdgeFields | SnapshotInfoEdgeFields, number | string>;

// Snapshot基础信息
export class SnapshotInfo {
    constructor(options: SnapshotInfoOptions) {
        this.init(options.text);
    }

    public heap: Snapshot = null as any;
    public node_list: SnapshotInfoNode[] = [];
    public edge_list: SnapshotInfoEdge[] = [];
    public nodes: Record<number | string, SnapshotInfoNode> = {};
    public edges: Record<number | string, SnapshotInfoEdge[]> = {};
    public edges_to: Record<number | string, SnapshotInfoEdge[]> = {};
    public node_fields_idx: Record<SnapshotNodeFields, number> = {} as any;
    public edge_fields_idx: Record<SnapshotEdgeFields, number> = {} as any;
    public node_field_count: number = 0;
    public edge_fields_count: number = 0;
    static ROOT_NODE_ID = 1;
    static NO_RETAINED_SIZE = -1;
    static NO_DISTANCE = 0;
    static BASE_SYSTEM_DISTANCE = 100000000;

    // 初始化：分析snapshot
    init = (text: string) => {
        try{
            this.heap = JSON.parse(text);
        } catch (e) {
            throw new Error("could not format snapshot string")
        }
        if(this.heap){
            this.initFieldsIndex();
            this.initNodes();
            this.initEdges();
            this.initDistance();
            this.initNodesRetainedSize();
        }
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
        let node: SnapshotInfoNode;
        for (let i = 0; i < node_count; ++i) {
            node = this.getNode(i * this.node_field_count);
            this.node_list.push(node);
            this.nodes[node.id as number] = node;
        }
    }

    // 获取node
    getNode = (node_start: number): SnapshotInfoNode => {
        const node_field = this.heap.snapshot.meta.node_fields;
        const node: Partial<SnapshotInfoNode> = {
            retained_size: SnapshotInfo.NO_RETAINED_SIZE,
            distance: SnapshotInfo.NO_DISTANCE
        };
        for (let i = 0; i < this.node_field_count; ++i) {
            // todo name: concatenated string
            node[node_field[i]] = this.getNodeField(node_start, i);
            if(node_field[i] === SnapshotNodeFields.self_size){
                node.retained_size = node.self_size;
            }
        }
        return node as SnapshotInfoNode;
    }

    // 获取node某个field值
    getNodeField = (node_start: number, node_field_idx: number) => {
        const value = this.heap.nodes[node_start + node_field_idx];
        const type = this.heap.snapshot.meta.node_types[node_field_idx];
        if (type === SnapshotNodeTypes.string) return this.heap.strings[value];
        if (type === SnapshotNodeTypes.number) return value;
        if (Array.isArray(type)) return type[value];
        throw new Error("unsupported node field type: " + type);
    }

    // 初始化：edges信息
    initEdges = () => {
        let edge_start = 0;
        let edge: SnapshotInfoEdge;
        let from_node_id: number;
        this.node_list.forEach(node => {
            from_node_id = node.id as number;
            for (let j = 0; j < node.edge_count; ++j) {
                edge = this.getEdge(edge_start, from_node_id);
                // edge list
                this.edge_list.push(edge);
                // edge from map
                this.edges[from_node_id] = this.edges[from_node_id] || [];
                this.edges[from_node_id].push(edge);
                // edge to map
                this.edges_to[edge.to_node] = this.edges_to[edge.to_node] || [];
                this.edges_to[edge.to_node].push(edge);
                edge_start += this.edge_fields_count;
            }
        });
    }

    // 获取edge
    getEdge = (edge_start: number, from_node: number): SnapshotInfoEdge => {
        const edge_field = this.heap.snapshot.meta.edge_fields;
        const edge: Partial<SnapshotInfoEdge> = {
            from_node
        };
        for (let i = 0; i < this.edge_fields_count; ++i) {
            edge[edge_field[i]] = this.getEdgeField(edge_start, i);
        }
        return edge as SnapshotInfoEdge;
    }

    // 获取edge的field
    getEdgeField = (edge_start: number, field_index: number) => {
        const value = this.heap.edges[edge_start + field_index];
        const type = this.heap.snapshot.meta.edge_types[field_index];
        if (type === SnapshotEdgeTypes.string_or_number) {
            return this.heap.strings[value];
        } else if (type === SnapshotEdgeTypes.node) {
            return this.getNodeField(value, this.node_fields_idx[SnapshotNodeFields.id]);
        } else if (Array.isArray(type)) {
            return type[value]
        }
        throw new Error("unsupported edge field type: " + type)
    }

    // 初始化：对象自身大小加上它依赖链路上的所有对象的自身大小（Shallow size）之和
    initNodesRetainedSize = () => {
        // for(let i = this.node_list.length - 1; i>=0; i--){
        //     this.edges[this.node_list[i].id]?.forEach(edge => {
        //         (this.node_list[i].retained_size as number) += (this.nodes[edge.to_node].retained_size as number);
        //     })
        // }
        // this.node_list.forEach(node => {
        //     this.edges[node.id]
        // })
    }

    // getNodeTree = (node: SnapshotInfoNode): number => {
    //
    // }

    // 初始化：距离
    initDistance = () => {
        const root_node = this.nodes[SnapshotInfo.ROOT_NODE_ID];
        const nodesToVisit = new Array(this.node_list.length);
        let nodesToVisitLength = 0;
        let node_to: SnapshotInfoNode;
        // BFS for user root objects.
        this.edges[root_node.id].forEach(edge => {
            node_to = this.nodes[edge.to_node];
            if(node_to.type !== SnapshotNodeTypes.synthetic){
                (node_to.distance = 1);
                nodesToVisit[nodesToVisitLength++] = node_to;
            }
        });
        this.setNodeChildDistance(nodesToVisit, nodesToVisitLength);
        // BFS for objects not reached from user roots.
        root_node.distance = nodesToVisitLength > 0 ? SnapshotInfo.BASE_SYSTEM_DISTANCE : 0;
        nodesToVisit[0] = root_node;
        nodesToVisitLength = 1;
        this.setNodeChildDistance(nodesToVisit, nodesToVisitLength);
    }

    // 设置node距离
    setNodeChildDistance = (nodesToVisit: SnapshotInfoNode[], nodesToVisitLength: number) => {
        let index = 0;
        let node: SnapshotInfoNode;
        let node_to: SnapshotInfoNode;
        while (index < nodesToVisitLength) {
            node = nodesToVisit[index++];
            this.edges[node.id]?.forEach(edge => {
                node_to = this.nodes[edge.to_node];
                if(edge.type === SnapshotEdgeTypes.weak
                    || node_to.distance !== SnapshotInfo.NO_DISTANCE
                    || !this.nodesDistanceFilter(node_to, edge)){
                    return;
                }
                node_to.distance = (node.distance as number) + 1;
                nodesToVisit[nodesToVisitLength++] = node_to;
            })
        }
    }

    // node距离过滤
    nodesDistanceFilter = (node: SnapshotInfoNode, edge: SnapshotInfoEdge) => {
        if (node.type === SnapshotNodeTypes.hidden) {
            return edge.name_or_index !== 'sloppy_function_map' || node.name !== 'system / NativeContext';
        }
        if (node.type === SnapshotNodeTypes.array) {
            if (node.name !== '(map descriptors)') {
                return true;
            }
            const index = parseInt(edge.name_or_index as string, 10);
            return index < 2 || (index % 3) !== 1;
        }
        return true;
    }
}

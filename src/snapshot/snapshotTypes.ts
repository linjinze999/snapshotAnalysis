export interface Snapshot {
    snapshot: {
        meta: {
            node_fields: Array<SnapshotNodeFields>,
            node_types: Array<SnapshotNodeTypes | SnapshotNodeTypes[]>,
            edge_fields: Array<SnapshotEdgeFields>,
            edge_types: Array<SnapshotEdgeTypes | SnapshotEdgeTypes[]>,
            trace_function_info_fields: Array<SnapshotTraceFunctionInfoFields>,
            trace_node_fields: Array<SnapshotTraceNodeFields>,
            sample_fields : Array<SnapshotSampleFields>,
            location_fields: Array<SnapshotLocationFields>
        },
        node_count: number,
        edge_count: number,
        trace_function_count: number
    },
    nodes: Array<number>,
    edges: Array<number>,
    trace_function_infos: Array<number>,
    trace_tree: Array<number>,
    samples: Array<number>,
    locations: Array<number>,
    strings: Array<string>
}

// node_fields
export enum SnapshotNodeFields {
    type = "type",
    name = "name",
    id = "id",
    self_size = "self_size",
    edge_count = "edge_count",
    trace_node_id = "trace_node_id",
    detachedness = "detachedness"
}

// node_types
export enum SnapshotNodeTypes {
    hidden = "hidden",
    array = "array",
    string = "string",
    object = "object",
    code = "code",
    closure = "closure",
    regexp = "regexp",
    number = "number",
    native = "native",
    synthetic = "synthetic",
    concatenated_string = "concatenated string",
    sliced_string = "sliced string",
    symbol = "symbol",
    bigint = "bigint"
}

// edge_fields
export enum SnapshotEdgeFields {
    type= "type",
    name_or_index = "name_or_index",
    to_node = "to_node"
}

// edge_types
export enum SnapshotEdgeTypes {
    context = "context",
    element="element",
    property="property",
    internal="internal",
    hidden="hidden",
    shortcut="shortcut",
    weak="weak",
    string_or_number="string_or_number",
    node= "node"
}

// trace_function_info_fields
export enum SnapshotTraceFunctionInfoFields {
    function_id = "function_id",
    name = "name",
    script_name = "script_name",
    script_id = "script_id",
    line = "line",
    column= "column"
}

// trace_node_fields
export enum SnapshotTraceNodeFields {
    id = "id",
    function_info_index="function_info_index",
    count = "count",
    size = "size",
    children = "children"
}

// sample_fields
export enum SnapshotSampleFields {
    "timestamp_us" = "timestamp_us",
    "last_assigned_id" = "last_assigned_id"
}

// location_fields
export enum SnapshotLocationFields {
    object_index = "object_index",
    script_id="script_id",
    line="line",
    column="column"
}

export default Snapshot;

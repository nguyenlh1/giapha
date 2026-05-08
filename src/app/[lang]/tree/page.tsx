"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ReactFlow, {
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    Node,
    Edge,
    ConnectionMode,
    MarkerType,
    Handle,
    Position,
    MiniMap
} from "reactflow";
import dagre from "dagre";
import "reactflow/dist/style.css";

const nodeWidth = 280;
const nodeHeight = 105;

function getLayoutedElements(nodes: Node[], edges: Edge[], isVi: boolean) {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: "TB", nodesep: 140, ranksep: 100, edgesep: 60 });

    nodes.forEach((node) => {
        g.setNode(node.id, { width: nodeWidth, height: nodeHeight });
    });

    edges.forEach((edge) => {
        g.setEdge(edge.source, edge.target, { minlen: (edge as any).isSpouse ? 0 : 1 });
    });

    dagre.layout(g);

    const layoutedNodes = nodes.map((node) => {
        const nodeWithPosition = g.node(node.id);
        return {
            ...node,
            data: {
                ...node.data,
                isVi
            },
            position: {
                x: nodeWithPosition.x - nodeWidth / 2,
                y: nodeWithPosition.y - nodeHeight / 2,
            },
        };
    });

    return { nodes: layoutedNodes, edges };
}

function PersonNode({ data }: { data: any }) {
    const isFemale = data.gender === "FEMALE";
    const isMale = data.gender === "MALE";
    const isDead = !!data.deathDate;
    const isVi = data.isVi !== false;

    return (
        <div className={`relative px-4 py-3.5 rounded-3xl border-2 min-w-[280px] transition-all duration-300 shadow-sm hover:shadow-xl hover:-translate-y-1 ${isFemale
            ? "bg-gradient-to-br from-pink-50 via-white to-pink-50/80 border-pink-300 hover:border-pink-400"
            : isMale
                ? "bg-gradient-to-br from-blue-50 via-white to-blue-50/80 border-blue-300 hover:border-blue-400"
                : "bg-gradient-to-br from-purple-50 via-white to-purple-50/80 border-purple-300 hover:border-purple-400"
            } ${isDead ? "opacity-90 grayscale-[20%]" : ""}`}>
            <Handle type="target" position={Position.Top} className="w-3.5 h-3.5 border-2 border-white !bg-slate-500" />

            <div className="flex items-start gap-4">
                <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center text-xl font-black text-white shadow-md ${isFemale ? "bg-pink-500" : isMale ? "bg-blue-600" : "bg-purple-500"
                    }`}>
                    {data.label?.[0]}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-base font-black text-slate-900 truncate tracking-tight" title={data.label}>{data.label}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-slate-300 shadow-sm text-slate-700 font-bold whitespace-nowrap">
                            {isVi ? "Thế hệ" : "Gen"} {data.generation}
                        </span>
                        <span className="text-[11px] text-slate-700 font-mono font-bold bg-slate-200/50 px-2 flex items-center h-5 rounded-md border border-slate-200/60 truncate">{data.code}</span>
                    </div>
                </div>
            </div>

            <div className="mt-3 pt-2.5 border-t-2 border-slate-200/70 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-700 bg-white/80 px-2.5 py-0.5 rounded-full shadow-sm border border-slate-200/60">
                    {data.birthDate ? new Date(data.birthDate).getFullYear() : "?"} <span className="opacity-40 mx-1 font-mono">—</span> {data.deathDate ? new Date(data.deathDate).getFullYear() : ""}
                </p>
                {isDead && (
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100/80 px-2 py-0.5 border border-slate-200 rounded-md">
                        {isVi ? "Đã mất" : "Deceased"}
                    </span>
                )}
            </div>

            <Handle type="source" position={Position.Bottom} className="w-3.5 h-3.5 border-2 border-white !bg-slate-500" />
        </div>
    );
}

const nodeTypes = { personNode: PersonNode };

export default function TreePage({ params }: { params: { lang: string } }) {
    const isVi = params.lang === "vi";
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [clans, setClans] = useState<any[]>([]);
    const [selectedClan, setSelectedClan] = useState("");
    const [loading, setLoading] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState<any | null>(null);

    useEffect(() => {
        fetch("/api/clans").then(r => r.json()).then((data) => {
            setClans(data);
            if (data.length > 0) setSelectedClan(data[0].id);
        });
    }, []);

    useEffect(() => {
        if (!selectedClan) return;
        setLoading(true);
        fetch(`/api/tree?clanId=${selectedClan}`)
            .then(r => r.json())
            .then((data) => {
                const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
                    data.nodes || [],
                    (data.edges || []).map((e: any) => ({
                        ...e,
                        label: e.isSpouse ? (isVi ? "Vợ chồng" : "Spouse") : (
                            e.relationSubType === "ADOPTIVE" ? (isVi ? "Con nuôi" : "Adoptive") :
                                e.relationSubType === "STEP" ? (isVi ? "Con kế" : "Stepchild") :
                                    e.relationSubType === "GUARDIAN" ? (isVi ? "Giám hộ" : "Ward") :
                                        (isVi ? "Con" : "Child")
                        ),
                        labelStyle: { fill: e.isSpouse ? '#f59e0b' : '#3b82f6', fontWeight: 600, fontSize: 10 },
                        labelBgStyle: { fill: 'white', fillOpacity: 0.9 },
                        markerEnd: {
                            type: MarkerType.ArrowClosed,
                            color: e.style?.stroke || '#cbd5e1'
                        },
                    })),
                    isVi
                );
                setNodes(layoutedNodes);
                setEdges(layoutedEdges);
                setSelectedPerson(null);
            })
            .finally(() => setLoading(false));
    }, [selectedClan, isVi]);

    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        setSelectedPerson(node.data);
    }, []);

    const selectedPersonNodeId = Object.values(nodes).find((n: any) => n.data?.code === selectedPerson?.code)?.id;

    return (
        <div className="h-[calc(100vh-8rem)] relative flex overflow-hidden rounded-xl border border-slate-200/60 shadow-lg bg-white">
            <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                    <h1 className="text-xl font-bold text-slate-900">
                        {isVi ? "Cây gia phả" : "Family Tree"}
                    </h1>
                    <select
                        value={selectedClan}
                        onChange={e => setSelectedClan(e.target.value)}
                        className="input-field w-64 shadow-sm"
                    >
                        {clans.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex-1 relative">
                    {loading ? (
                        <div className="flex items-center justify-center h-full bg-slate-50/50">
                            <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
                        </div>
                    ) : (
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            onNodesChange={onNodesChange}
                            onEdgesChange={onEdgesChange}
                            nodeTypes={nodeTypes}
                            onNodeClick={onNodeClick}
                            connectionMode={ConnectionMode.Loose}
                            fitView
                            minZoom={0.1}
                            maxZoom={1.5}
                            className="bg-slate-50/30"
                        >
                            <Controls className="!bg-white !shadow-md !border-slate-200 !rounded-lg" />
                            <MiniMap className="!bg-white/90 !shadow-lg !rounded-xl !border-slate-200 backdrop-blur-sm" zoomable pannable />
                            <Background gap={20} size={1} color="#cbd5e1" />
                        </ReactFlow>
                    )}
                </div>
            </div>

            {/* Side Panel for Node Details */}
            <div className={`w-80 bg-white border-l border-slate-200 shadow-2xl transition-transform duration-300 absolute right-0 top-0 bottom-0 z-10 
        ${selectedPerson ? "translate-x-0" : "translate-x-full"}`}>
                {selectedPerson && (
                    <div className="h-full flex flex-col p-6">
                        <button
                            onClick={() => setSelectedPerson(null)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                            title="Close"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>

                        <div className="text-center mt-6 mb-6">
                            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-lg mb-4 ${selectedPerson.gender === "FEMALE" ? "bg-pink-400 shadow-pink-200" : selectedPerson.gender === "MALE" ? "bg-blue-500 shadow-blue-200" : "bg-purple-400 shadow-purple-200"
                                }`}>
                                {selectedPerson.label?.[0]}
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">{selectedPerson.label}</h2>
                            <p className="text-sm text-slate-500 font-mono mt-1">{selectedPerson.code}</p>
                            <span className={`badge mt-3 ${selectedPerson.gender === "MALE" ? "badge-male" : selectedPerson.gender === "FEMALE" ? "badge-female" : "badge-other"}`}>
                                {selectedPerson.gender === "MALE" ? (isVi ? "Nam" : "Male") : selectedPerson.gender === "FEMALE" ? (isVi ? "Nữ" : "Female") : (isVi ? "Khác" : "Other")}
                            </span>
                        </div>

                        <div className="flex-1 space-y-5 overflow-y-auto pr-2">
                            <div>
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{isVi ? "Thông tin cơ bản" : "Basic Info"}</p>
                                <p className="text-sm text-slate-700 bg-slate-50 px-3 py-2.5 rounded-lg border border-slate-100 leading-relaxed shadow-sm">
                                    <span className="font-medium inline-block w-20">{isVi ? "Thế hệ:" : "Generation:"}</span> {selectedPerson.generation} <br />
                                    <span className="font-medium inline-block w-20">{isVi ? "Năm sinh:" : "Birth Year:"}</span> {selectedPerson.birthDate ? new Date(selectedPerson.birthDate).getFullYear() : "—"} <br />
                                    <span className="font-medium inline-block w-20">{isVi ? "Năm mất:" : "Death Year:"}</span> {selectedPerson.deathDate ? new Date(selectedPerson.deathDate).getFullYear() : "—"}
                                </p>
                            </div>

                            {selectedPerson.bio && (
                                <div>
                                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{isVi ? "Tiểu sử" : "Biography"}</p>
                                    <p className="text-sm text-slate-700 bg-slate-50 px-3 py-2.5 rounded-lg border border-slate-100 leading-relaxed shadow-sm">
                                        {selectedPerson.bio}
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100">
                            {selectedPersonNodeId && (
                                <Link
                                    href={`/${params.lang}/persons/${selectedPersonNodeId}`}
                                    className="w-full btn-primary flex items-center justify-center gap-2 py-2.5 shadow-md hover:shadow-lg"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                                    </svg>
                                    {isVi ? "Xem chi tiết hồ sơ" : "View Full Profile"}
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}

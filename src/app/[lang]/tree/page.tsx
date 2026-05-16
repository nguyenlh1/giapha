"use client";

import { useCallback, useEffect, useState, useRef } from "react";
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
const nodeHeight = 115;

function getLayoutedElements(nodes: Node[], edges: Edge[], isVi: boolean) {
    const g = new dagre.graphlib.Graph();
    g.setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: "TB", nodesep: 150, ranksep: 100, edgesep: 60 });

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

            {/* Collapse/Expand Toggle Button */}
            {data.hasChildren && (
                <button
                    onClick={(e) => { e.stopPropagation(); data.onToggleCollapse?.(); }}
                    className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 bg-white border-2 border-slate-300 w-7 h-7 rounded-full flex items-center justify-center text-slate-600 hover:text-primary-600 hover:border-primary-400 z-10 shadow-sm transition-colors cursor-pointer font-bold pb-0.5"
                    title={data.isCollapsed ? (isVi ? "Mở rộng nhánh" : "Expand branch") : (isVi ? "Thu gọn nhánh" : "Collapse branch")}
                >
                    {data.isCollapsed ? "+" : "−"}
                </button>
            )}
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

    // State for filtering & collapsing
    const [rawNodes, setRawNodes] = useState<Node[]>([]);
    const [rawEdges, setRawEdges] = useState<any[]>([]);
    const [maxGenLimit, setMaxGenLimit] = useState<number>(1);
    const [currentMaxGen, setCurrentMaxGen] = useState<number>(1);
    const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

    // React Flow instance for manual camera controls
    const [rfInstance, setRfInstance] = useState<any>(null);

    // Fullscreen state and ref
    const containerRef = useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen?.().catch(err => {
                console.error("Error attempting to enable fullscreen:", err);
            });
        } else {
            document.exitFullscreen?.();
        }
    };

    useEffect(() => {
        fetch("/api/clans").then(r => {
            if (!r.ok) return [];
            return r.json().catch(() => []); // Fallback for bad JSON
        }).then((data) => {
            setClans(data || []);
            if (data && data.length > 0) setSelectedClan(data[0].id);
        }).catch(err => console.error("Error fetching clans:", err));
    }, []);

    useEffect(() => {
        if (!selectedClan) return;
        setLoading(true);
        fetch(`/api/tree?clanId=${selectedClan}`)
            .then(async r => {
                if (!r.ok) throw new Error("API not ok");
                return r.json();
            })
            .then((data) => {
                const apiNodes = data.nodes || [];
                const maxGen = apiNodes.reduce((max: number, node: any) => Math.max(max, node.data.generation || 1), 1);

                setMaxGenLimit(maxGen);
                setCurrentMaxGen(maxGen);
                setCollapsedNodes(new Set());
                setRawNodes(apiNodes);

                const apiEdges = (data.edges || []).map((e: any) => ({
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
                }));
                setRawEdges(apiEdges);
                setSelectedPerson(null);
            })
            .catch(err => {
                console.error("Failed to load tree data:", err);
                setRawNodes([]);
                setRawEdges([]);
            })
            .finally(() => setLoading(false));
    }, [selectedClan, isVi]);

    // Apply generation filter, collapses, and dagre layout
    useEffect(() => {
        if (!rawNodes.length) return;

        // 1. Filter by Max Generation Slider
        let visibleNodes = rawNodes.filter(n => n.data.generation <= currentMaxGen);

        // 2. Filter by Node Collapses
        const hiddenIds = new Set<string>();
        const traverseToHide = (nodeId: string) => {
            const childEdges = rawEdges.filter(e => e.source === nodeId && !e.isSpouse);
            childEdges.forEach(e => {
                if (!hiddenIds.has(e.target)) {
                    hiddenIds.add(e.target);
                    // Recursively hide descendants
                    traverseToHide(e.target);
                }
            });
        };

        // For each collapsed node that is visible, hide all descendants
        collapsedNodes.forEach(id => {
            if (visibleNodes.some(n => n.id === id)) {
                traverseToHide(id);
            }
        });

        visibleNodes = visibleNodes.filter(n => !hiddenIds.has(n.id));
        const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
        const visibleEdges = rawEdges.filter(e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target));

        // Inject computed data and handlers into nodes
        const finalNodes = visibleNodes.map(n => {
            const hasChildren = rawEdges.some(e => e.source === n.id && !e.isSpouse);
            return {
                ...n,
                data: {
                    ...n.data,
                    hasChildren,
                    isCollapsed: collapsedNodes.has(n.id),
                    onToggleCollapse: () => {
                        setCollapsedNodes(prev => {
                            const next = new Set(prev);
                            if (next.has(n.id)) next.delete(n.id);
                            else next.add(n.id);
                            return next;
                        });
                    }
                }
            };
        });

        const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(finalNodes, visibleEdges, isVi);
        setNodes(layoutedNodes);
        setEdges(layoutedEdges);

        // Autofocus logically
        if (rfInstance && layoutedNodes.length > 0) {
            setTimeout(() => {
                const topNodes = layoutedNodes.filter(n => n.data.generation <= 2);
                if (topNodes.length > 0) {
                    rfInstance.fitView({
                        nodes: topNodes,
                        padding: 0.4,
                        maxZoom: 0.9,
                        duration: 800
                    });
                } else {
                    rfInstance.fitView({ padding: 0.4, maxZoom: 0.9, duration: 800 });
                }
            }, 50);
        }

    }, [rawNodes, rawEdges, currentMaxGen, collapsedNodes, isVi, setNodes, setEdges, rfInstance]);

    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        // Prevent toggle button click from triggering node selection
        if ((event.target as HTMLElement).tagName.toLowerCase() === 'button') {
            return;
        }
        setSelectedPerson(node.data);
    }, []);

    const selectedPersonNodeId = Object.values(nodes).find((n: any) => n.data?.code === selectedPerson?.code)?.id;

    return (
        <div ref={containerRef} className={`${isFullscreen ? 'fixed inset-0 z-[100] rounded-none m-0' : 'h-[calc(100vh-8rem)] relative rounded-xl'} flex overflow-hidden border border-slate-200/60 shadow-lg bg-white w-full`}>
            <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center gap-4 p-4 border-b border-slate-100 bg-slate-50/50 flex-wrap">
                    <h1 className="text-xl font-bold text-slate-900 shrink-0">
                        {isVi ? "Cây gia phả" : "Family Tree"}
                    </h1>
                    <select
                        value={selectedClan}
                        onChange={e => setSelectedClan(e.target.value)}
                        className="input-field w-56 shadow-sm shrink-0"
                    >
                        {clans.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>

                    <div className="w-px h-6 bg-slate-200 mx-2 hidden sm:block" />

                    {/* Generation Filter Slider */}
                    {maxGenLimit > 1 && (
                        <div className="flex items-center gap-3 bg-white px-4 py-1.5 rounded-lg border border-slate-200 shadow-sm flex-1 min-w-[250px]">
                            <span className="text-sm font-medium text-slate-600 shrink-0">
                                {isVi ? "Hiển thị đến thế hệ:" : "Show up to Gen:"} <span className="text-primary-600 font-bold">{currentMaxGen}</span>
                            </span>
                            <input
                                type="range"
                                min={1}
                                max={maxGenLimit}
                                value={currentMaxGen}
                                onChange={(e) => setCurrentMaxGen(parseInt(e.target.value))}
                                className="w-full accent-primary-600"
                            />
                        </div>
                    )}

                    {/* Full Screen Toggle Button */}
                    <button
                        onClick={toggleFullscreen}
                        className="p-1.5 sm:p-2 sm:ml-auto bg-white rounded-lg border border-slate-200 shadow-sm text-slate-600 hover:text-primary-600 hover:bg-slate-50 transition-colors shrink-0"
                        title={isVi ? (isFullscreen ? "Thu nhỏ màn hình" : "Toàn màn hình") : (isFullscreen ? "Exit Full Screen" : "Full Screen")}
                    >
                        {isFullscreen ? (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                            </svg>
                        )}
                    </button>
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
                            onInit={setRfInstance}
                            connectionMode={ConnectionMode.Loose}
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface Person {
    id: string;
    code: string;
    fullName: string;
    gender: string;
    generation: number;
    birthDate: string | null;
    deathDate: string | null;
    clan: { name: string };
}

export default function PersonsPage({ params }: { params: { lang: string } }) {
    const [persons, setPersons] = useState<Person[]>([]);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [generation, setGeneration] = useState("");
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const { data: session } = useSession();
    const isVi = params.lang === "vi";
    const canWrite = session?.user && ((session.user as any).role === "ADMIN" || (session.user as any).role === "EDITOR");

    const fetchPersons = () => {
        setLoading(true);
        const qs = new URLSearchParams({ page: String(page), limit: "20" });
        if (search) qs.set("search", search);
        if (generation) qs.set("generation", generation);
        fetch(`/api/persons?${qs}`)
            .then((r) => r.json())
            .then((d) => { setPersons(d.persons || []); setTotal(d.total || 0); })
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchPersons(); }, [page, generation]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchPersons();
    };

    const totalPages = Math.ceil(total / 20);

    const formatDate = (d: string | null) => {
        if (!d) return "—";
        return new Date(d).toLocaleDateString(isVi ? "vi-VN" : "en-US");
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {isVi ? "Danh sách thành viên" : "Members List"}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {total} {isVi ? "thành viên" : "members"}
                    </p>
                </div>
                {canWrite && (
                    <Link href={`/${params.lang}/persons/new`} className="btn-primary inline-flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        {isVi ? "Thêm thành viên" : "Add Member"}
                    </Link>
                )}
            </div>

            {/* Filters */}
            <div className="card p-4 mb-6">
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={isVi ? "Tìm theo tên hoặc mã..." : "Search by name or code..."}
                        className="input-field flex-1"
                    />
                    <select
                        value={generation}
                        onChange={(e) => { setGeneration(e.target.value); setPage(1); }}
                        className="input-field sm:w-48"
                    >
                        <option value="">{isVi ? "Tất cả thế hệ" : "All Generations"}</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((g) => (
                            <option key={g} value={g}>{isVi ? `Thế hệ ${g}` : `Generation ${g}`}</option>
                        ))}
                    </select>
                    <button type="submit" className="btn-primary">
                        {isVi ? "Tìm kiếm" : "Search"}
                    </button>
                </form>
            </div>

            {/* Table */}
            <div className="card overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-48">
                        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="table-header">{isVi ? "Mã" : "Code"}</th>
                                    <th className="table-header">{isVi ? "Họ và tên" : "Full Name"}</th>
                                    <th className="table-header">{isVi ? "Giới tính" : "Gender"}</th>
                                    <th className="table-header">{isVi ? "Ngày sinh" : "Birth Date"}</th>
                                    <th className="table-header">{isVi ? "Thế hệ" : "Gen"}</th>
                                    <th className="table-header">{isVi ? "Dòng họ" : "Clan"}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {persons.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="table-cell font-mono text-xs text-slate-500">{p.code}</td>
                                        <td className="table-cell">
                                            <Link href={`/${params.lang}/persons/${p.id}`} className="font-medium text-primary-600 hover:text-primary-700 hover:underline">
                                                {p.fullName}
                                            </Link>
                                        </td>
                                        <td className="table-cell">
                                            <span className={`badge ${p.gender === "MALE" ? "badge-male" : p.gender === "FEMALE" ? "badge-female" : "badge-other"}`}>
                                                {p.gender === "MALE" ? (isVi ? "Nam" : "Male") : p.gender === "FEMALE" ? (isVi ? "Nữ" : "Female") : (isVi ? "Khác" : "Other")}
                                            </span>
                                        </td>
                                        <td className="table-cell text-slate-500">{formatDate(p.birthDate)}</td>
                                        <td className="table-cell">{p.generation}</td>
                                        <td className="table-cell text-slate-500">{p.clan?.name}</td>
                                    </tr>
                                ))}
                                {persons.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="table-cell text-center text-slate-400 py-12">
                                            {isVi ? "Không tìm thấy thành viên" : "No members found"}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                        <p className="text-sm text-slate-500">
                            {isVi ? `Trang ${page} / ${totalPages}` : `Page ${page} of ${totalPages}`}
                        </p>
                        <div className="flex gap-2">
                            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-sm disabled:opacity-50">
                                ←
                            </button>
                            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-sm disabled:opacity-50">
                                →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

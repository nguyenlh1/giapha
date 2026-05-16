"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardData {
    totalMembers: number;
    totalClans: number;
    totalRelationships: number;
    totalGenerations: number;
    fundBalance?: number;
    recentMembers: any[];
}

export default function DashboardPage({ params }: { params: { lang: string } }) {
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const isVi = params.lang === "vi";

    useEffect(() => {
        fetch("/api/dashboard")
            .then((r) => r.ok ? r.json() : null)
            .then(setData)
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    const stats = [
        {
            label: isVi ? "Tổng thành viên" : "Total Members",
            value: data?.totalMembers || 0,
            color: "text-blue-600",
            bg: "bg-blue-50",
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
            ),
        },
        {
            label: isVi ? "Số thế hệ" : "Generations",
            value: data?.totalGenerations || 0,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
                </svg>
            ),
        },
        {
            label: isVi ? "Dòng họ" : "Clans",
            value: data?.totalClans || 0,
            color: "text-amber-600",
            bg: "bg-amber-50",
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
            ),
        },
        {
            label: isVi ? "Quan hệ" : "Relationships",
            value: data?.totalRelationships || 0,
            color: "text-violet-600",
            bg: "bg-violet-50",
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
            ),
        },
        {
            label: isVi ? "Số dư quỹ" : "Fund Balance",
            value: data ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(data.fundBalance || 0) : "0 ₫",
            color: "text-blue-600",
            bg: "bg-blue-50",
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                </svg>
            ),
        },
    ];

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">
                    {isVi ? "Tổng quan" : "Dashboard"}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    {isVi ? "Tổng quan hệ thống gia phả" : "Family genealogy system overview"}
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.map((stat, i) => (
                    <div key={i} className="card p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                                <p className="text-3xl font-bold text-slate-900 mt-1">{stat.value}</p>
                            </div>
                            <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center ${stat.color}`}>
                                {stat.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Members */}
            <div className="card">
                <div className="px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-900">
                        {isVi ? "Thành viên mới thêm" : "Recently Added Members"}
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="table-header">{isVi ? "Mã" : "Code"}</th>
                                <th className="table-header">{isVi ? "Họ và tên" : "Full Name"}</th>
                                <th className="table-header">{isVi ? "Giới tính" : "Gender"}</th>
                                <th className="table-header">{isVi ? "Thế hệ" : "Generation"}</th>
                                <th className="table-header">{isVi ? "Dòng họ" : "Clan"}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {data?.recentMembers?.map((p: any) => (
                                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="table-cell font-mono text-xs">{p.code}</td>
                                    <td className="table-cell">
                                        <Link href={`/${params.lang}/persons/${p.id}`} className="font-medium text-primary-600 hover:text-primary-700">
                                            {p.fullName}
                                        </Link>
                                    </td>
                                    <td className="table-cell">
                                        <span className={`badge ${p.gender === "MALE" ? "badge-male" : p.gender === "FEMALE" ? "badge-female" : "badge-other"}`}>
                                            {p.gender === "MALE" ? (isVi ? "Nam" : "Male") : p.gender === "FEMALE" ? (isVi ? "Nữ" : "Female") : (isVi ? "Khác" : "Other")}
                                        </span>
                                    </td>
                                    <td className="table-cell">{p.generation}</td>
                                    <td className="table-cell text-slate-500">{p.clan?.name}</td>
                                </tr>
                            ))}
                            {(!data?.recentMembers || data.recentMembers.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="table-cell text-center text-slate-400 py-8">
                                        {isVi ? "Chưa có dữ liệu" : "No data yet"}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

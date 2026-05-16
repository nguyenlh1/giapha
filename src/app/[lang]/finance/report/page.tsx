"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

interface CategoryData {
    category: string;
    labelVi: string;
    labelEn: string;
    total: number;
    count: number;
}

interface PeriodSummary {
    totalContributions: number;
    contributionCount: number;
    totalExpenses: number;
    expenseCount: number;
    balance: number;
}

interface Transaction {
    id: string;
    type: "CONTRIBUTION" | "EXPENSE";
    categoryId: string;
    category: { id: string; name: string; type: string };
    amount: string;
    date: string;
    description: string | null;
    person: { id: string; fullName: string; code: string } | null;
}

interface ClanOption {
    id: string;
    name: string;
}

interface CategoryOption {
    id: string;
    name: string;
    type: "CONTRIBUTION" | "EXPENSE";
}

const PIE_COLORS = [
    "#10b981", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6", "#ec4899", "#6b7280"
];

function formatCurrency(value: number): string {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("vi-VN");
}

export default function ReportPage({ params }: { params: { lang: string } }) {
    const isVi = params.lang === "vi";
    const searchParams = useSearchParams();

    const [clans, setClans] = useState<ClanOption[]>([]);
    const [selectedClan, setSelectedClan] = useState(searchParams.get("clanId") || "");
    const [filterType, setFilterType] = useState("");
    const [filterCategory, setFilterCategory] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [loading, setLoading] = useState(true);

    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
    const [periodSummary, setPeriodSummary] = useState<PeriodSummary | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);

    useEffect(() => {
        fetch("/api/clans")
            .then((r) => r.ok ? r.json() : [])
            .then((data) => {
                setClans(data);
                if (!selectedClan && data.length > 0) setSelectedClan(data[0].id);
            });
    }, []);

    useEffect(() => {
        if (!selectedClan) return;
        fetchData();
    }, [selectedClan, filterType, filterCategory, dateFrom, dateTo, page]);

    const fetchData = async () => {
        setLoading(true);
        const baseParams = new URLSearchParams();
        baseParams.set("clanId", selectedClan);
        if (filterType) baseParams.set("type", filterType);
        if (filterCategory) baseParams.set("category", filterCategory);
        if (dateFrom) baseParams.set("dateFrom", dateFrom);
        if (dateTo) baseParams.set("dateTo", dateTo);

        const txParams = new URLSearchParams(baseParams);
        txParams.set("page", String(page));
        txParams.set("limit", "15");

        try {
            const [reportRes, txRes, catRes] = await Promise.all([
                fetch(`/api/finance/report?${baseParams}`).then((r) => r.ok ? r.json() : { categoryData: [], periodSummary: null }),
                fetch(`/api/finance?${txParams}`).then((r) => r.ok ? r.json() : { transactions: [], total: 0 }),
                fetch(`/api/finance/categories?clanId=${selectedClan}`).then((r) => r.ok ? r.json() : []),
            ]);
            setCategoryData(reportRes.categoryData);
            setPeriodSummary(reportRes.periodSummary);
            setTransactions(txRes.transactions);
            setTotal(txRes.total);
            setCategories(catRes);
        } finally {
            setLoading(false);
        }
    };

    const totalExpenseAmount = categoryData.reduce((s, d) => s + d.total, 0) || 1;

    // Build CSS conic-gradient for pie chart
    const conicStops: string[] = [];
    let cumPercent = 0;
    categoryData.forEach((d, i) => {
        const percent = (d.total / totalExpenseAmount) * 100;
        conicStops.push(`${PIE_COLORS[i % PIE_COLORS.length]} ${cumPercent}% ${cumPercent + percent}%`);
        cumPercent += percent;
    });
    const conicGradient = conicStops.length > 0
        ? `conic-gradient(${conicStops.join(", ")})`
        : "conic-gradient(#e2e8f0 0% 100%)";

    const totalPages = Math.ceil(total / 15);

    const handleExportCSV = () => {
        if (transactions.length === 0) return;
        const header = isVi
            ? "Ngày,Loại,Danh mục,Người liên quan,Số tiền,Mô tả"
            : "Date,Type,Category,Person,Amount,Description";
        const rows = transactions.map((tx) =>
            [
                formatDate(tx.date),
                tx.type === "CONTRIBUTION" ? (isVi ? "Đóng góp" : "Contribution") : (isVi ? "Chi tiêu" : "Expense"),
                tx.category?.name || "—",
                tx.person?.fullName || "",
                tx.amount,
                `"${(tx.description || "").replace(/"/g, '""')}"`,
            ].join(",")
        );
        const csv = [header, ...rows].join("\n");
        const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `finance_report_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">
                    {isVi ? "Báo cáo tài chính" : "Financial Report"}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    {isVi ? "Phân tích thu chi theo kỳ và danh mục" : "Analyze income and expenses by period and category"}
                </p>
            </div>

            {/* Filters */}
            <div className="card p-4 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
                    {clans.length > 1 && (
                        <select
                            value={selectedClan}
                            onChange={(e) => { setSelectedClan(e.target.value); setPage(1); }}
                            className="input-field text-sm"
                        >
                            {clans.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    )}
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                        className="input-field text-sm"
                        placeholder={isVi ? "Từ ngày" : "From"}
                    />
                    <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                        className="input-field text-sm"
                        placeholder={isVi ? "Đến ngày" : "To"}
                    />
                    <select
                        value={filterType}
                        onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
                        className="input-field text-sm"
                    >
                        <option value="">{isVi ? "Tất cả loại" : "All Types"}</option>
                        <option value="CONTRIBUTION">{isVi ? "Đóng góp" : "Contribution"}</option>
                        <option value="EXPENSE">{isVi ? "Chi tiêu" : "Expense"}</option>
                    </select>
                    <select
                        value={filterCategory}
                        onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
                        className="input-field text-sm"
                    >
                        <option value="">{isVi ? "Tất cả danh mục" : "All Categories"}</option>
                        {categories.filter(c => filterType ? c.type === filterType : true).map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleExportCSV}
                        className="btn-primary text-sm flex items-center justify-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        {isVi ? "Xuất CSV" : "Export CSV"}
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
                </div>
            ) : (
                <>
                    {/* Charts & Summary Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                        {/* Pie Chart */}
                        <div className="card p-6">
                            <h2 className="text-lg font-semibold text-slate-900 mb-4">
                                {filterType === "CONTRIBUTION" ? (isVi ? "Phân bổ đóng góp theo danh mục" : "Contribution Breakdown by Category") : (isVi ? "Phân bổ chi tiêu theo danh mục" : "Expense Breakdown by Category")}
                            </h2>
                            <div className="flex items-center gap-6">
                                <div
                                    className="w-40 h-40 rounded-full flex-shrink-0"
                                    style={{ background: conicGradient }}
                                />
                                <div className="space-y-2">
                                    {categoryData.map((d, i) => (
                                        <div key={d.category} className="flex items-center gap-2">
                                            <div
                                                className="w-3 h-3 rounded-sm flex-shrink-0"
                                                style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                                            />
                                            <span className="text-sm text-slate-600">
                                                {isVi ? d.labelVi : d.labelEn}
                                            </span>
                                            <span className="text-sm font-medium text-slate-900 ml-auto">
                                                {((d.total / totalExpenseAmount) * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    ))}
                                    {categoryData.length === 0 && (
                                        <p className="text-sm text-slate-400">{isVi ? "Không có dữ liệu" : "No data"}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Period Summary */}
                        <div className="card p-6">
                            <h2 className="text-lg font-semibold text-slate-900 mb-4">
                                {isVi ? "Tổng hợp kỳ" : "Period Summary"}
                            </h2>
                            {periodSummary && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                                            <span className="text-sm text-slate-600">
                                                {isVi ? "Tổng đóng góp" : "Total Contributions"}
                                            </span>
                                            <span className="text-xs text-slate-400">({periodSummary.contributionCount})</span>
                                        </div>
                                        <span className="text-lg font-bold text-emerald-600">
                                            {formatCurrency(periodSummary.totalContributions)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                                            <span className="text-sm text-slate-600">
                                                {isVi ? "Tổng chi tiêu" : "Total Expenses"}
                                            </span>
                                            <span className="text-xs text-slate-400">({periodSummary.expenseCount})</span>
                                        </div>
                                        <span className="text-lg font-bold text-red-600">
                                            {formatCurrency(periodSummary.totalExpenses)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 bg-slate-50 rounded-lg px-3">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                                            <span className="text-sm font-semibold text-slate-700">
                                                {isVi ? "Số dư" : "Balance"}
                                            </span>
                                        </div>
                                        <span className={`text-xl font-bold ${periodSummary.balance >= 0 ? "text-blue-600" : "text-red-600"}`}>
                                            {formatCurrency(periodSummary.balance)}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Transaction Table */}
                    <div className="card">
                        <div className="px-6 py-4 border-b border-slate-100">
                            <h2 className="text-lg font-semibold text-slate-900">
                                {isVi ? `Danh sách giao dịch (${total})` : `Transactions (${total})`}
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="table-header">{isVi ? "Ngày" : "Date"}</th>
                                        <th className="table-header">{isVi ? "Loại" : "Type"}</th>
                                        <th className="table-header">{isVi ? "Danh mục" : "Category"}</th>
                                        <th className="table-header">{isVi ? "Người liên quan" : "Person"}</th>
                                        <th className="table-header text-right">{isVi ? "Số tiền" : "Amount"}</th>
                                        <th className="table-header">{isVi ? "Mô tả" : "Description"}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {transactions.map((tx) => (
                                        <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="table-cell text-sm">{formatDate(tx.date)}</td>
                                            <td className="table-cell">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tx.type === "CONTRIBUTION"
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : "bg-red-100 text-red-700"
                                                    }`}>
                                                    {tx.type === "CONTRIBUTION"
                                                        ? (isVi ? "Đóng góp" : "Contribution")
                                                        : (isVi ? "Chi tiêu" : "Expense")}
                                                </span>
                                            </td>
                                            <td className="table-cell text-sm text-slate-600">
                                                {tx.category?.name || "—"}
                                            </td>
                                            <td className="table-cell text-sm">
                                                {tx.person ? tx.person.fullName : "—"}
                                            </td>
                                            <td className={`table-cell text-sm text-right font-semibold ${tx.type === "CONTRIBUTION" ? "text-emerald-600" : "text-red-600"
                                                }`}>
                                                {tx.type === "CONTRIBUTION" ? "+" : "−"}{formatCurrency(Number(tx.amount))}
                                            </td>
                                            <td className="table-cell text-sm text-slate-500 max-w-[200px] truncate">
                                                {tx.description || "—"}
                                            </td>
                                        </tr>
                                    ))}
                                    {transactions.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="table-cell text-center text-slate-400 py-8">
                                                {isVi ? "Không có giao dịch" : "No transactions found"}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100">
                                <p className="text-sm text-slate-500">
                                    {isVi ? `Trang ${page} / ${totalPages}` : `Page ${page} of ${totalPages}`}
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isVi ? "Trước" : "Prev"}
                                    </button>
                                    <button
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {isVi ? "Sau" : "Next"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

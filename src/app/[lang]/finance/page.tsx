"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface SummaryData {
    totalContributions: number;
    totalExpenses: number;
    balance: number;
    thisMonthCount: number;
    monthlyData: { month: string; contributions: number; expenses: number }[];
}

interface Transaction {
    id: string;
    type: "CONTRIBUTION" | "EXPENSE";
    categoryId: string;
    amount: string;
    date: string;
    description: string | null;
    category: { id: string; name: string; type: string };
    person: { id: string; fullName: string; code: string } | null;
    clan: { id: string; name: string };
}

interface ClanOption {
    id: string;
    name: string;
}

interface PersonOption {
    id: string;
    fullName: string;
    code: string;
}

interface CategoryOption {
    id: string;
    name: string;
    type: "CONTRIBUTION" | "EXPENSE";
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString("vi-VN");
}

export default function FinancePage({ params }: { params: { lang: string } }) {
    const { data: session } = useSession();
    const isVi = params.lang === "vi";
    const canWrite = session && ["ADMIN", "EDITOR"].includes((session.user as any)?.role);

    const [summary, setSummary] = useState<SummaryData | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [clans, setClans] = useState<ClanOption[]>([]);
    const [categories, setCategories] = useState<CategoryOption[]>([]);
    const [selectedClan, setSelectedClan] = useState("");
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);

    // Form state
    const [formType, setFormType] = useState<"CONTRIBUTION" | "EXPENSE">("CONTRIBUTION");
    const [formCategory, setFormCategory] = useState("ANNUAL_FUND");
    const [formAmount, setFormAmount] = useState("");
    const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
    const [formPersonId, setFormPersonId] = useState("");
    const [formDescription, setFormDescription] = useState("");
    const [formSubmitting, setFormSubmitting] = useState(false);
    const [persons, setPersons] = useState<PersonOption[]>([]);

    useEffect(() => {
        fetch("/api/clans")
            .then((r) => r.ok ? r.json() : [])
            .then((data) => {
                setClans(data);
                if (data.length > 0) setSelectedClan(data[0].id);
            });
    }, []);

    useEffect(() => {
        if (!selectedClan) return;
        setLoading(true);
        Promise.all([
            fetch(`/api/finance/summary?clanId=${selectedClan}`).then((r) => r.ok ? r.json() : null),
            fetch(`/api/finance?clanId=${selectedClan}&limit=10`).then((r) => r.ok ? r.json() : { transactions: [] }),
            fetch(`/api/persons?clanId=${selectedClan}&limit=200`).then((r) => r.ok ? r.json() : { persons: [] }),
            fetch(`/api/finance/categories?clanId=${selectedClan}`).then((r) => r.ok ? r.json() : []),
        ])
            .then(([summaryData, txData, personData, categoriesData]) => {
                setSummary(summaryData);
                setTransactions(txData.transactions);
                setPersons(personData.persons || []);
                setCategories(categoriesData);
                if (categoriesData.length > 0) {
                    const firstContrib = categoriesData.find((c: CategoryOption) => c.type === "CONTRIBUTION");
                    if (firstContrib) setFormCategory(firstContrib.id);
                }
            })
            .finally(() => setLoading(false));
    }, [selectedClan]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClan || !formAmount) return;
        setFormSubmitting(true);

        try {
            const res = await fetch("/api/finance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clanId: selectedClan,
                    type: formType,
                    categoryId: formCategory,
                    amount: parseInt(formAmount.replace(/\D/g, "")),
                    date: formDate,
                    personId: formPersonId || null,
                    description: formDescription || null,
                }),
            });

            if (res.ok) {
                setShowModal(false);
                resetForm();
                // Refresh data
                const [summaryData, txData] = await Promise.all([
                    fetch(`/api/finance/summary?clanId=${selectedClan}`).then((r) => r.ok ? r.json() : null),
                    fetch(`/api/finance?clanId=${selectedClan}&limit=10`).then((r) => r.ok ? r.json() : { transactions: [] }),
                ]);
                setSummary(summaryData);
                setTransactions(txData.transactions);
            }
        } finally {
            setFormSubmitting(false);
        }
    };

    const handleSetFormType = (type: "CONTRIBUTION" | "EXPENSE") => {
        setFormType(type);
        const relatedCat = categories.find(c => c.type === type);
        setFormCategory(relatedCat ? relatedCat.id : "");
    };

    const resetForm = () => {
        setFormType("CONTRIBUTION");
        const initCat = categories.find(c => c.type === "CONTRIBUTION");
        setFormCategory(initCat ? initCat.id : "");
        setFormAmount("");
        setFormDate(new Date().toISOString().split("T")[0]);
        setFormPersonId("");
        setFormDescription("");
    };

    const handleDelete = async (id: string) => {
        if (!confirm(isVi ? "Bạn có chắc chắn muốn xóa giao dịch này?" : "Are you sure you want to delete this transaction?")) return;

        const res = await fetch(`/api/finance/${id}`, { method: "DELETE" });
        if (res.ok) {
            const [summaryData, txData] = await Promise.all([
                fetch(`/api/finance/summary?clanId=${selectedClan}`).then((r) => r.ok ? r.json() : null),
                fetch(`/api/finance?clanId=${selectedClan}&limit=10`).then((r) => r.ok ? r.json() : { transactions: [] }),
            ]);
            setSummary(summaryData);
            setTransactions(txData.transactions);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    const maxBarValue = summary ? Math.max(
        ...summary.monthlyData.map((d) => Math.max(d.contributions, d.expenses)),
        1
    ) : 1;

    const stats = [
        {
            label: isVi ? "Tổng đóng góp" : "Total Contributions",
            value: formatCurrency(summary?.totalContributions || 0),
            color: "text-emerald-600",
            bg: "bg-emerald-50",
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            label: isVi ? "Tổng chi tiêu" : "Total Expenses",
            value: formatCurrency(summary?.totalExpenses || 0),
            color: "text-red-600",
            bg: "bg-red-50",
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
            ),
        },
        {
            label: isVi ? "Số dư quỹ" : "Fund Balance",
            value: formatCurrency(summary?.balance || 0),
            color: "text-blue-600",
            bg: "bg-blue-50",
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                </svg>
            ),
        },
        {
            label: isVi ? "Giao dịch tháng này" : "This Month",
            value: summary?.thisMonthCount || 0,
            color: "text-violet-600",
            bg: "bg-violet-50",
            icon: (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
            ),
        },
    ];

    return (
        <div>
            {/* Header */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {isVi ? "Tài chính dòng họ" : "Clan Finance"}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {isVi ? "Quản lý đóng góp và chi tiêu" : "Manage contributions and expenses"}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {clans.length > 1 && (
                        <select
                            value={selectedClan}
                            onChange={(e) => setSelectedClan(e.target.value)}
                            className="input-field text-sm"
                        >
                            {clans.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    )}
                    {canWrite && (
                        <>
                            <button
                                onClick={() => setShowCategoryModal(true)}
                                className="btn-secondary flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
                                </svg>
                                {isVi ? "Danh mục" : "Categories"}
                            </button>
                            <button
                                onClick={() => setShowModal(true)}
                                className="btn-primary flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                {isVi ? "Thêm giao dịch" : "Add Transaction"}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.map((stat, i) => (
                    <div key={i} className="card p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                                <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
                            </div>
                            <div className={`w-12 h-12 ${stat.bg} rounded-xl flex items-center justify-center ${stat.color}`}>
                                {stat.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Bar Chart */}
            {summary && summary.monthlyData.length > 0 && (
                <div className="card p-6 mb-8">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">
                        {isVi ? "Thu chi 6 tháng gần nhất" : "Last 6 Months Overview"}
                    </h2>
                    <div className="flex items-end gap-3 h-48">
                        {summary.monthlyData.map((d, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <div className="w-full flex gap-1 items-end h-40">
                                    <div
                                        className="flex-1 bg-emerald-400 rounded-t-md transition-all duration-500 min-h-[2px]"
                                        style={{ height: `${(d.contributions / maxBarValue) * 100}%` }}
                                        title={`${isVi ? "Đóng góp" : "Contributions"}: ${formatCurrency(d.contributions)}`}
                                    />
                                    <div
                                        className="flex-1 bg-red-400 rounded-t-md transition-all duration-500 min-h-[2px]"
                                        style={{ height: `${(d.expenses / maxBarValue) * 100}%` }}
                                        title={`${isVi ? "Chi tiêu" : "Expenses"}: ${formatCurrency(d.expenses)}`}
                                    />
                                </div>
                                <span className="text-xs text-slate-500 mt-1">{d.month}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-center gap-6 mt-4">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-emerald-400 rounded" />
                            <span className="text-xs text-slate-600">{isVi ? "Đóng góp" : "Contributions"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-400 rounded" />
                            <span className="text-xs text-slate-600">{isVi ? "Chi tiêu" : "Expenses"}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Transactions Table */}
            <div className="card">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-slate-900">
                        {isVi ? "Giao dịch gần đây" : "Recent Transactions"}
                    </h2>
                    <a
                        href={`/${params.lang}/finance/report${selectedClan ? `?clanId=${selectedClan}` : ""}`}
                        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                    >
                        {isVi ? "Xem báo cáo →" : "View Report →"}
                    </a>
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
                                {canWrite && (session?.user as any)?.role === "ADMIN" && (
                                    <th className="table-header"></th>
                                )}
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
                                    {canWrite && (session?.user as any)?.role === "ADMIN" && (
                                        <td className="table-cell">
                                            <button
                                                onClick={() => handleDelete(tx.id)}
                                                className="text-red-400 hover:text-red-600 transition-colors"
                                                title={isVi ? "Xóa" : "Delete"}
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                </svg>
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {transactions.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="table-cell text-center text-slate-400 py-8">
                                        {isVi ? "Chưa có giao dịch nào" : "No transactions yet"}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Transaction Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                        <div className="px-6 py-4 border-b border-slate-100">
                            <h3 className="text-lg font-semibold text-slate-900">
                                {isVi ? "Thêm giao dịch mới" : "Add New Transaction"}
                            </h3>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            {/* Type */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    {isVi ? "Loại giao dịch" : "Transaction Type"}
                                </label>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => handleSetFormType("CONTRIBUTION")}
                                        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border-2 transition-all ${formType === "CONTRIBUTION"
                                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                            : "border-slate-200 text-slate-500 hover:border-slate-300"
                                            }`}
                                    >
                                        {isVi ? "💰 Đóng góp" : "💰 Contribution"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSetFormType("EXPENSE")}
                                        className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border-2 transition-all ${formType === "EXPENSE"
                                            ? "border-red-500 bg-red-50 text-red-700"
                                            : "border-slate-200 text-slate-500 hover:border-slate-300"
                                            }`}
                                    >
                                        {isVi ? "💸 Chi tiêu" : "💸 Expense"}
                                    </button>
                                </div>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {isVi ? "Danh mục" : "Category"}
                                </label>
                                <select
                                    value={formCategory}
                                    onChange={(e) => setFormCategory(e.target.value)}
                                    className="input-field"
                                >
                                    {categories.filter(c => c.type === formType).map((cat) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                                {categories.filter(c => c.type === formType).length === 0 && (
                                    <p className="text-xs text-red-500 mt-1">
                                        {isVi ? "Chưa có danh mục nào cho loại này. Hãy tạo danh mục trước!" : "No categories found for this type. Create one first!"}
                                    </p>
                                )}
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {isVi ? "Số tiền (VND)" : "Amount (VND)"}
                                </label>
                                <input
                                    type="text"
                                    value={formAmount}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, "");
                                        setFormAmount(val ? Number(val).toLocaleString("vi-VN") : "");
                                    }}
                                    className="input-field"
                                    placeholder="0"
                                    required
                                />
                            </div>

                            {/* Date */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {isVi ? "Ngày giao dịch" : "Transaction Date"}
                                </label>
                                <input
                                    type="date"
                                    value={formDate}
                                    onChange={(e) => setFormDate(e.target.value)}
                                    className="input-field"
                                    required
                                />
                            </div>

                            {/* Person */}
                            {formType === "CONTRIBUTION" && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">
                                        {isVi ? "Người đóng góp" : "Contributor"}
                                    </label>
                                    <select
                                        value={formPersonId}
                                        onChange={(e) => setFormPersonId(e.target.value)}
                                        className="input-field"
                                    >
                                        <option value="">{isVi ? "-- Chọn (tùy chọn) --" : "-- Select (optional) --"}</option>
                                        {persons.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.fullName} ({p.code})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    {isVi ? "Ghi chú" : "Notes"}
                                </label>
                                <textarea
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    className="input-field"
                                    rows={3}
                                    placeholder={isVi ? "Mô tả chi tiết..." : "Details..."}
                                />
                            </div>

                            {/* Buttons */}
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowModal(false); resetForm(); }}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                                >
                                    {isVi ? "Hủy" : "Cancel"}
                                </button>
                                <button
                                    type="submit"
                                    disabled={formSubmitting}
                                    className="btn-primary"
                                >
                                    {formSubmitting
                                        ? (isVi ? "Đang lưu..." : "Saving...")
                                        : (isVi ? "Lưu giao dịch" : "Save Transaction")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Category Management Modal */}
            {showCategoryModal && (
                <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                            <h3 className="text-lg font-semibold text-slate-900">
                                {isVi ? "Quản lý Danh mục Thu/Chi" : "Manage Categories"}
                            </h3>
                            <button onClick={() => setShowCategoryModal(false)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Contributions */}
                                <div>
                                    <h4 className="font-semibold text-emerald-700 mb-4 flex items-center gap-2">
                                        <span>💰</span> {isVi ? "Thu (Đóng góp)" : "Contributions"}
                                    </h4>
                                    <div className="space-y-2 mb-4">
                                        {categories.filter(c => c.type === "CONTRIBUTION").map(cat => (
                                            <div key={cat.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                                <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm(isVi ? "Xóa danh mục này?" : "Delete category?")) return;
                                                        setLoading(true);
                                                        try {
                                                            const res = await fetch(`/api/finance/categories/${cat.id}`, { method: "DELETE" });
                                                            if (!res.ok) {
                                                                const err = await res.json().catch(() => ({}));
                                                                alert(err.error || "Cannot delete");
                                                            } else {
                                                                setCategories(categories.filter(c => c.id !== cat.id));
                                                            }
                                                        } finally { setLoading(false); }
                                                    }}
                                                    className="text-slate-400 hover:text-red-500"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        const form = e.target as HTMLFormElement;
                                        const input = form.elements.namedItem("name") as HTMLInputElement;
                                        if (!input.value) return;

                                        const res = await fetch("/api/finance/categories", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ clanId: selectedClan, type: "CONTRIBUTION", name: input.value })
                                        });
                                        if (res.ok) {
                                            const newCat = await res.json();
                                            setCategories([...categories, newCat]);
                                            input.value = "";
                                        } else {
                                            const err = await res.json();
                                            alert(err.error || "Error creating category");
                                        }
                                    }} className="flex gap-2">
                                        <input type="text" name="name" placeholder={isVi ? "Tên danh mục..." : "Category name..."} className="input-field text-sm flex-1" required />
                                        <button type="submit" className="btn-secondary text-sm shrink-0">{isVi ? "Thêm" : "Add"}</button>
                                    </form>
                                </div>

                                {/* Expenses */}
                                <div>
                                    <h4 className="font-semibold text-red-700 mb-4 flex items-center gap-2">
                                        <span>💸</span> {isVi ? "Chi tiêu" : "Expenses"}
                                    </h4>
                                    <div className="space-y-2 mb-4">
                                        {categories.filter(c => c.type === "EXPENSE").map(cat => (
                                            <div key={cat.id} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                                <span className="text-sm font-medium text-slate-700">{cat.name}</span>
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm(isVi ? "Xóa danh mục này?" : "Delete category?")) return;
                                                        setLoading(true);
                                                        try {
                                                            const res = await fetch(`/api/finance/categories/${cat.id}`, { method: "DELETE" });
                                                            if (!res.ok) {
                                                                const err = await res.json().catch(() => ({}));
                                                                alert(err.error || "Cannot delete");
                                                            } else {
                                                                setCategories(categories.filter(c => c.id !== cat.id));
                                                            }
                                                        } finally { setLoading(false); }
                                                    }}
                                                    className="text-slate-400 hover:text-red-500"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <form onSubmit={async (e) => {
                                        e.preventDefault();
                                        const form = e.target as HTMLFormElement;
                                        const input = form.elements.namedItem("name") as HTMLInputElement;
                                        if (!input.value) return;

                                        const res = await fetch("/api/finance/categories", {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify({ clanId: selectedClan, type: "EXPENSE", name: input.value })
                                        });
                                        if (res.ok) {
                                            const newCat = await res.json();
                                            setCategories([...categories, newCat]);
                                            input.value = "";
                                        } else {
                                            const err = await res.json();
                                            alert(err.error || "Error creating category");
                                        }
                                    }} className="flex gap-2">
                                        <input type="text" name="name" placeholder={isVi ? "Tên danh mục..." : "Category name..."} className="input-field text-sm flex-1" required />
                                        <button type="submit" className="btn-secondary text-sm shrink-0">{isVi ? "Thêm" : "Add"}</button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

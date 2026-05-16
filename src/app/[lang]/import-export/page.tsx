"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";

export default function ImportExportPage({ params }: { params: { lang: string } }) {
    const isVi = params.lang === "vi";
    const { data: session } = useSession();
    const canWrite = session?.user && ((session.user as any).role === "ADMIN" || (session.user as any).role === "EDITOR");
    const [importing, setImporting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleExport = async () => {
        setExporting(true);
        setMessage(null);
        try {
            const res = await fetch("/api/export");
            if (!res.ok) throw new Error("Export failed");
            const data = await res.json().catch(() => ({}));
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `giapha-export-${new Date().toISOString().split("T")[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            setMessage({ type: "success", text: isVi ? "Xuất dữ liệu thành công!" : "Data exported successfully!" });
        } catch {
            setMessage({ type: "error", text: isVi ? "Lỗi khi xuất dữ liệu" : "Error exporting data" });
        }
        setExporting(false);
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImporting(true);
        setMessage(null);

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            const res = await fetch("/api/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || "Import failed");
            }
            setMessage({ type: "success", text: isVi ? "Nhập dữ liệu thành công!" : "Data imported successfully!" });
        } catch (err: any) {
            setMessage({ type: "error", text: err.message || (isVi ? "Lỗi khi nhập dữ liệu" : "Error importing data") });
        }
        setImporting(false);
        if (fileRef.current) fileRef.current.value = "";
    };

    if (!canWrite) {
        return (
            <div className="text-center py-12">
                <p className="text-slate-500">{isVi ? "Bạn không có quyền truy cập tính năng này" : "You do not have access to this feature"}</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900">
                    {isVi ? "Nhập / Xuất dữ liệu" : "Import / Export Data"}
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                    {isVi ? "Quản lý dữ liệu gia phả bằng file JSON" : "Manage genealogy data via JSON files"}
                </p>
            </div>

            {message && (
                <div className={`mb-6 px-4 py-3 rounded-lg text-sm ${message.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
                    {message.text}
                </div>
            )}

            <div className="grid gap-6">
                {/* Export */}
                <div className="card p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-slate-900">{isVi ? "Xuất dữ liệu" : "Export Data"}</h2>
                            <p className="text-sm text-slate-500 mt-1">{isVi ? "Xuất toàn bộ dữ liệu gia phả ra file JSON" : "Export all genealogy data to a JSON file"}</p>
                            <button onClick={handleExport} disabled={exporting} className="btn-primary mt-4 text-sm disabled:opacity-50">
                                {exporting ? (isVi ? "Đang xuất..." : "Exporting...") : (isVi ? "Tải xuống JSON" : "Download JSON")}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Import */}
                <div className="card p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-slate-900">{isVi ? "Nhập dữ liệu" : "Import Data"}</h2>
                            <p className="text-sm text-slate-500 mt-1">{isVi ? "Nhập dữ liệu từ file JSON. Dữ liệu hiện có sẽ được cập nhật." : "Import data from a JSON file. Existing data will be updated."}</p>
                            <div className="mt-4">
                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept=".json"
                                    onChange={handleImport}
                                    className="hidden"
                                    id="import-file"
                                />
                                <label
                                    htmlFor="import-file"
                                    className={`btn-secondary text-sm cursor-pointer inline-flex items-center gap-2 ${importing ? "opacity-50 pointer-events-none" : ""}`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m6.75 12l-3-3m0 0l-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                                    </svg>
                                    {importing ? (isVi ? "Đang nhập..." : "Importing...") : (isVi ? "Chọn file JSON" : "Select JSON File")}
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

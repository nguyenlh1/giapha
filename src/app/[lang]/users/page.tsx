"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function UsersPage({ params }: { params: { lang: string } }) {
    const isVi = params.lang === "vi";
    const { data: session } = useSession();
    const isAdmin = (session?.user as any)?.role === "ADMIN";

    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: "", email: "", password: "", role: "VIEWER" });
    const [submitError, setSubmitError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!isAdmin) return;
        fetchUsers();
    }, [isAdmin]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/users");
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(isVi ? "Bạn có chắc chắn muốn xóa tài khoản này?" : "Are you sure you want to delete this user?")) return;

        try {
            const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
            if (res.ok) {
                setUsers(users.filter(u => u.id !== id));
            } else {
                const err = await res.json();
                alert(err.error || "Cannot delete user");
            }
        } catch (e) {
            alert("Error deleting user");
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setSubmitError("");

        try {
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setIsModalOpen(false);
                setFormData({ name: "", email: "", password: "", role: "VIEWER" });
                fetchUsers();
            } else {
                const err = await res.json();
                setSubmitError(err.error || "Failed to create user");
            }
        } catch {
            setSubmitError("Failed to connect");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isAdmin) {
        return (
            <div className="flex items-center justify-center h-full">
                <p className="text-slate-500">{isVi ? "Bạn không có quyền truy cập trang này." : "You do not have access to this page."}</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                        {isVi ? "Quản lý Tài khoản" : "User Management"}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        {isVi ? "Tạo và phân quyền người dùng xem hoặc sửa gia phả." : "Create and manage user roles."}
                    </p>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="btn-primary flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    {isVi ? "Tạo tài khoản" : "Create User"}
                </button>
            </div>

            <div className="card overflow-hidden">
                {loading ? (
                    <div className="p-12 flex justify-center">
                        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">{isVi ? "Tên Hiển Thị" : "Name"}</th>
                                    <th className="px-6 py-4">Email</th>
                                    <th className="px-6 py-4">{isVi ? "Quyền" : "Role"}</th>
                                    <th className="px-6 py-4 text-right">{isVi ? "Hành động" : "Actions"}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-900">{user.name}</td>
                                        <td className="px-6 py-4 text-slate-600">{user.email}</td>
                                        <td className="px-6 py-4">
                                            <span className={`badge ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' :
                                                    user.role === 'EDITOR' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-slate-100 text-slate-700'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {(session.user as any)?.email !== user.email && (
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="text-red-500 hover:text-red-700 font-medium"
                                                >
                                                    {isVi ? "Xóa" : "Delete"}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-slate-900">{isVi ? "Tạo Tài Khoản Mới" : "Create New User"}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handleCreate} className="p-6 space-y-4">
                            {submitError && (
                                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                                    {submitError}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{isVi ? "Tên Hiển Thị" : "Display Name"}</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="input-field"
                                    placeholder={isVi ? "Nhập tên người dùng..." : "Enter user's name..."}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                <input
                                    required
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="input-field"
                                    placeholder="admin@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{isVi ? "Mật khẩu" : "Password"}</label>
                                <input
                                    required
                                    minLength={6}
                                    type="password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="input-field"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{isVi ? "Quyền (Role)" : "Role"}</label>
                                <select
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    className="input-field"
                                >
                                    <option value="VIEWER">{isVi ? "Người xem (VIEWER)" : "Viewer"}</option>
                                    <option value="EDITOR">{isVi ? "Biên tập viên (EDITOR)" : "Editor"}</option>
                                    <option value="ADMIN">{isVi ? "Quản trị viên (ADMIN)" : "Admin"}</option>
                                </select>
                                <p className="text-xs text-slate-500 mt-2">
                                    {formData.role === "VIEWER" && (isVi ? "Chỉ được phép xem thông tin dòng họ." : "Can only view genealogy info.")}
                                    {formData.role === "EDITOR" && (isVi ? "Được phép tìm, sửa, thêm hồ sơ nhân sự." : "Can manage profiles and relationships.")}
                                    {formData.role === "ADMIN" && (isVi ? "Toàn quyền quản lý dòng họ, users và nhập xuất dữ liệu." : "Full access including user management.")}
                                </p>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary flex-1">
                                    {isVi ? "Hủy" : "Cancel"}
                                </button>
                                <button type="submit" disabled={submitting} className="btn-primary flex-1 disabled:opacity-50">
                                    {submitting ? (isVi ? "Đang tạo..." : "Creating...") : (isVi ? "Lưu" : "Save")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

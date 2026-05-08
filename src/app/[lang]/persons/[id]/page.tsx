"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export const dynamic = 'force-dynamic';
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function PersonDetailPage({ params }: { params: { lang: string; id: string } }) {
    const router = useRouter();
    const { data: session } = useSession();
    const isVi = params.lang === "vi";
    const canWrite = session?.user && ((session.user as any).role === "ADMIN" || (session.user as any).role === "EDITOR");

    const [person, setPerson] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState<any>({});
    const [saving, setSaving] = useState(false);
    const [allPersons, setAllPersons] = useState<any[]>([]);

    // Add relation state
    const [showRelForm, setShowRelForm] = useState(false);
    const [relForm, setRelForm] = useState({ toPersonId: "", type: "PARENT_CHILD", relationSubType: "BIOLOGICAL" });

    const fetchPerson = () => {
        setLoading(true);
        fetch(`/api/persons/${params.id}`)
            .then(r => r.json())
            .then(d => { setPerson(d); setForm(d); })
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchPerson(); }, [params.id]);
    useEffect(() => {
        fetch("/api/persons?limit=200").then(r => r.json()).then(d => setAllPersons(d.persons || []));
    }, []);

    const handleSave = async () => {
        setSaving(true);
        const res = await fetch(`/api/persons/${params.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fullName: form.fullName,
                gender: form.gender,
                birthDate: form.birthDate ? new Date(form.birthDate).toISOString() : null,
                deathDate: form.deathDate ? new Date(form.deathDate).toISOString() : null,
                generation: Number(form.generation),
                bio: form.bio,
                code: form.code,
                clanId: form.clanId,
            }),
        });
        if (res.ok) { fetchPerson(); setEditing(false); }
        setSaving(false);
    };

    const handleDelete = async () => {
        if (!confirm(isVi ? "Bạn có chắc muốn xóa?" : "Are you sure?")) return;
        await fetch(`/api/persons/${params.id}`, { method: "DELETE" });
        router.push(`/${params.lang}/persons`);
    };

    const handleAddRelation = async (e: React.FormEvent) => {
        e.preventDefault();
        await fetch("/api/relationships", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fromPersonId: params.id, ...relForm }),
        });
        setShowRelForm(false);
        setRelForm({ toPersonId: "", type: "PARENT_CHILD", relationSubType: "BIOLOGICAL" });
        fetchPerson();
    };

    const handleDeleteRelation = async (relId: string) => {
        await fetch(`/api/relationships/${relId}`, { method: "DELETE" });
        fetchPerson();
    };

    const formatDate = (d: string | null) => {
        if (!d) return "—";
        return new Date(d).toLocaleDateString(isVi ? "vi-VN" : "en-US");
    };

    const formatDateInput = (d: string | null) => {
        if (!d) return "";
        return new Date(d).toISOString().split("T")[0];
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (!person) {
        return <div className="text-center py-12 text-slate-500">{isVi ? "Không tìm thấy" : "Not found"}</div>;
    }

    const relations = [
        ...(person.relationsFrom || []).map((r: any) => ({ ...r, direction: "from", other: r.toPerson })),
        ...(person.relationsTo || []).map((r: any) => ({ ...r, direction: "to", other: r.fromPerson })),
    ];

    return (
        <div className="max-w-4xl mx-auto">
            <button onClick={() => router.push(`/${params.lang}/persons`)} className="text-sm text-primary-600 hover:text-primary-700 mb-4 inline-flex items-center gap-1">
                ← {isVi ? "Quay lại" : "Back"}
            </button>

            {/* Person Detail Card */}
            <div className="card p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white ${person.gender === "FEMALE" ? "bg-pink-500" : "bg-primary-500"}`}>
                            {person.fullName[0]}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">{person.fullName}</h1>
                            <p className="text-sm text-slate-500 font-mono">{person.code} · {isVi ? "Thế hệ" : "Gen"} {person.generation}</p>
                        </div>
                    </div>
                    {canWrite && !editing && (
                        <div className="flex gap-2">
                            <button onClick={() => setEditing(true)} className="btn-secondary text-sm">{isVi ? "Sửa" : "Edit"}</button>
                            <button onClick={handleDelete} className="btn-danger text-sm">{isVi ? "Xóa" : "Delete"}</button>
                        </div>
                    )}
                </div>

                {editing ? (
                    <div className="space-y-4 border-t border-slate-100 pt-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="label">{isVi ? "Họ và tên" : "Full Name"}</label>
                                <input value={form.fullName || ""} onChange={e => setForm({ ...form, fullName: e.target.value })} className="input-field" />
                            </div>
                            <div>
                                <label className="label">{isVi ? "Mã" : "Code"}</label>
                                <input value={form.code || ""} onChange={e => setForm({ ...form, code: e.target.value })} className="input-field" />
                            </div>
                            <div>
                                <label className="label">{isVi ? "Giới tính" : "Gender"}</label>
                                <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className="input-field">
                                    <option value="MALE">{isVi ? "Nam" : "Male"}</option>
                                    <option value="FEMALE">{isVi ? "Nữ" : "Female"}</option>
                                    <option value="OTHER">{isVi ? "Khác" : "Other"}</option>
                                </select>
                            </div>
                            <div>
                                <label className="label">{isVi ? "Thế hệ" : "Generation"}</label>
                                <input type="number" value={form.generation || 1} onChange={e => setForm({ ...form, generation: e.target.value })} className="input-field" />
                            </div>
                            <div>
                                <label className="label">{isVi ? "Ngày sinh" : "Birth Date"}</label>
                                <input type="date" value={formatDateInput(form.birthDate)} onChange={e => setForm({ ...form, birthDate: e.target.value })} className="input-field" />
                            </div>
                            <div>
                                <label className="label">{isVi ? "Ngày mất" : "Death Date"}</label>
                                <input type="date" value={formatDateInput(form.deathDate)} onChange={e => setForm({ ...form, deathDate: e.target.value })} className="input-field" />
                            </div>
                        </div>
                        <div>
                            <label className="label">{isVi ? "Tiểu sử" : "Biography"}</label>
                            <textarea value={form.bio || ""} onChange={e => setForm({ ...form, bio: e.target.value })} rows={3} className="input-field" />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">{saving ? "..." : (isVi ? "Lưu" : "Save")}</button>
                            <button onClick={() => { setEditing(false); setForm(person); }} className="btn-secondary text-sm">{isVi ? "Hủy" : "Cancel"}</button>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-100 pt-4">
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase">{isVi ? "Giới tính" : "Gender"}</p>
                            <p className="mt-1"><span className={`badge ${person.gender === "MALE" ? "badge-male" : person.gender === "FEMALE" ? "badge-female" : "badge-other"}`}>{person.gender === "MALE" ? (isVi ? "Nam" : "Male") : person.gender === "FEMALE" ? (isVi ? "Nữ" : "Female") : (isVi ? "Khác" : "Other")}</span></p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase">{isVi ? "Ngày sinh" : "Birth Date"}</p>
                            <p className="mt-1 text-sm text-slate-700">{formatDate(person.birthDate)}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase">{isVi ? "Ngày mất" : "Death Date"}</p>
                            <p className="mt-1 text-sm text-slate-700">{formatDate(person.deathDate)}</p>
                        </div>
                        <div>
                            <p className="text-xs font-medium text-slate-500 uppercase">{isVi ? "Dòng họ" : "Clan"}</p>
                            <p className="mt-1 text-sm text-slate-700">{person.clan?.name}</p>
                        </div>
                        {person.bio && (
                            <div className="col-span-2 sm:col-span-4">
                                <p className="text-xs font-medium text-slate-500 uppercase mb-1">{isVi ? "Tiểu sử" : "Biography"}</p>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{person.bio}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Relationships */}
            <div className="card">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h2 className="text-lg font-semibold text-slate-900">{isVi ? "Quan hệ" : "Relationships"}</h2>
                    {canWrite && (
                        <button onClick={() => setShowRelForm(!showRelForm)} className="btn-secondary text-sm">
                            {showRelForm ? (isVi ? "Đóng" : "Close") : (isVi ? "Thêm quan hệ" : "Add Relation")}
                        </button>
                    )}
                </div>

                {showRelForm && (
                    <form onSubmit={handleAddRelation} className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <select value={relForm.toPersonId} onChange={e => setRelForm({ ...relForm, toPersonId: e.target.value })} className="input-field" required>
                                <option value="">{isVi ? "Chọn thành viên" : "Select Member"}</option>
                                {allPersons.filter(p => p.id !== params.id).map(p => (
                                    <option key={p.id} value={p.id}>{p.fullName} ({p.code})</option>
                                ))}
                            </select>
                            <select value={relForm.type} onChange={e => setRelForm({ ...relForm, type: e.target.value })} className="input-field">
                                <option value="PARENT_CHILD">{isVi ? "Cha mẹ - Con" : "Parent-Child"}</option>
                                <option value="SPOUSE">{isVi ? "Vợ chồng" : "Spouse"}</option>
                            </select>
                            <select value={relForm.relationSubType} onChange={e => setRelForm({ ...relForm, relationSubType: e.target.value })} className="input-field">
                                <option value="BIOLOGICAL">{isVi ? "Ruột" : "Biological"}</option>
                                <option value="ADOPTIVE">{isVi ? "Nuôi" : "Adoptive"}</option>
                                <option value="GUARDIAN">{isVi ? "Giám hộ" : "Guardian"}</option>
                                <option value="STEP">{isVi ? "Kế" : "Step"}</option>
                            </select>
                        </div>
                        <button type="submit" className="btn-primary text-sm mt-3">{isVi ? "Thêm" : "Add"}</button>
                    </form>
                )}

                <div className="divide-y divide-slate-100">
                    {relations.length === 0 ? (
                        <p className="px-6 py-8 text-center text-slate-400 text-sm">{isVi ? "Chưa có quan hệ nào" : "No relationships yet"}</p>
                    ) : (
                        relations.map((r: any) => (
                            <div key={r.id} className="flex items-center justify-between px-6 py-3 hover:bg-slate-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white ${r.other?.gender === "FEMALE" ? "bg-pink-400" : "bg-primary-400"}`}>
                                        {r.other?.fullName?.[0]}
                                    </div>
                                    <div>
                                        <Link href={`/${params.lang}/persons/${r.other?.id}`} className="text-sm font-medium text-primary-600 hover:underline">
                                            {r.other?.fullName}
                                        </Link>
                                        <p className="text-xs text-slate-500">
                                            {r.type === "SPOUSE" ? (isVi ? "Vợ/Chồng" : "Spouse") : r.direction === "from" ? (isVi ? "Con" : "Child") : (isVi ? "Cha/Mẹ" : "Parent")}
                                            {" · "}
                                            {isVi
                                                ? (r.relationSubType === "BIOLOGICAL" ? "Ruột" : r.relationSubType === "ADOPTIVE" ? "Nuôi" : r.relationSubType === "GUARDIAN" ? "Giám hộ" : r.relationSubType === "STEP" ? "Kế" : r.relationSubType)
                                                : r.relationSubType.charAt(0) + r.relationSubType.slice(1).toLowerCase()}
                                        </p>
                                    </div>
                                </div>
                                {canWrite && (
                                    <button onClick={() => handleDeleteRelation(r.id)} className="text-red-400 hover:text-red-600 transition-colors p-1">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

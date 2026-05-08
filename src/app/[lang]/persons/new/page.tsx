"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Clan { id: string; name: string; }

export default function NewPersonPage({ params }: { params: { lang: string } }) {
    const router = useRouter();
    const isVi = params.lang === "vi";
    const [clans, setClans] = useState<Clan[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        clanId: "",
        code: "",
        fullName: "",
        gender: "MALE",
        birthDate: "",
        deathDate: "",
        generation: 1,
        bio: "",
    });

    useEffect(() => {
        fetch("/api/clans").then(r => r.json()).then(setClans);
    }, []);

    useEffect(() => {
        if (clans.length > 0 && !form.clanId) {
            setForm(f => ({ ...f, clanId: clans[0].id }));
        }
    }, [clans]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const res = await fetch("/api/persons", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...form,
                generation: Number(form.generation),
                birthDate: form.birthDate || null,
                deathDate: form.deathDate || null,
            }),
        });

        if (res.ok) {
            const person = await res.json();
            router.push(`/${params.lang}/persons/${person.id}`);
        } else {
            const data = await res.json();
            setError(data.error?.fieldErrors ? JSON.stringify(data.error.fieldErrors) : "Error creating member");
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="mb-6">
                <button onClick={() => router.back()} className="text-sm text-primary-600 hover:text-primary-700 mb-2 inline-flex items-center gap-1">
                    ← {isVi ? "Quay lại" : "Back"}
                </button>
                <h1 className="text-2xl font-bold text-slate-900">
                    {isVi ? "Tạo thành viên mới" : "Create New Member"}
                </h1>
            </div>

            <div className="card p-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="label">{isVi ? "Dòng họ" : "Clan"} *</label>
                            <select value={form.clanId} onChange={e => setForm(f => ({ ...f, clanId: e.target.value }))} className="input-field" required>
                                {clans.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">{isVi ? "Mã" : "Code"} *</label>
                            <input type="text" value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="input-field" placeholder="VD: NG-001" required />
                        </div>
                    </div>

                    <div>
                        <label className="label">{isVi ? "Họ và tên" : "Full Name"} *</label>
                        <input type="text" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} className="input-field" required />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="label">{isVi ? "Giới tính" : "Gender"}</label>
                            <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className="input-field">
                                <option value="MALE">{isVi ? "Nam" : "Male"}</option>
                                <option value="FEMALE">{isVi ? "Nữ" : "Female"}</option>
                                <option value="OTHER">{isVi ? "Khác" : "Other"}</option>
                            </select>
                        </div>
                        <div>
                            <label className="label">{isVi ? "Ngày sinh" : "Birth Date"}</label>
                            <input type="date" value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} className="input-field" />
                        </div>
                        <div>
                            <label className="label">{isVi ? "Ngày mất" : "Death Date"}</label>
                            <input type="date" value={form.deathDate} onChange={e => setForm(f => ({ ...f, deathDate: e.target.value }))} className="input-field" />
                        </div>
                    </div>

                    <div>
                        <label className="label">{isVi ? "Thế hệ" : "Generation"}</label>
                        <input type="number" min={1} max={20} value={form.generation} onChange={e => setForm(f => ({ ...f, generation: parseInt(e.target.value) || 1 }))} className="input-field w-32" />
                    </div>

                    <div>
                        <label className="label">{isVi ? "Tiểu sử" : "Biography"}</label>
                        <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={4} className="input-field" />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
                            {loading ? (isVi ? "Đang lưu..." : "Saving...") : (isVi ? "Tạo thành viên" : "Create Member")}
                        </button>
                        <button type="button" onClick={() => router.back()} className="btn-secondary">
                            {isVi ? "Hủy" : "Cancel"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

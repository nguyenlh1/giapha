import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/rbac";

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    const session = await requireAdmin();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        // Prevent deleting oneself
        if (session.email && typeof session.email === "string") {
            const self = await prisma.user.findUnique({ where: { email: session.email } });
            if (self?.id === params.id) {
                return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
            }
        }

        await prisma.user.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
    }
}

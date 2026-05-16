import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, unauthorized } from "@/lib/rbac";

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const user = await getSessionUser();
    if (!user || user.role === "VIEWER") return unauthorized();

    try {
        const category = await prisma.financeCategory.findUnique({
            where: { id: params.id },
            include: {
                _count: {
                    select: { transactions: true }
                }
            }
        });

        if (!category) {
            return NextResponse.json({ error: "Category not found" }, { status: 404 });
        }

        // Validate permissions
        if (user.clanId && category.clanId !== user.clanId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Block if transactions are currently bound to this category
        if (category._count.transactions > 0) {
            return NextResponse.json({
                error: "Cannot delete category because it is already used in transactions. Please reassign the transactions first."
            }, { status: 409 });
        }

        await prisma.financeCategory.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to delete category" }, { status: 500 });
    }
}

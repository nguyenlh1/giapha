import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, unauthorized, forbidden, canWrite, isAdmin, hasClanAccess } from "@/lib/rbac";

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    if (!canWrite(user.role)) return forbidden();

    const existing = await prisma.transaction.findUnique({
        where: { id: params.id },
    });
    if (!existing || !hasClanAccess(user, existing.clanId)) {
        return NextResponse.json({ error: "Transaction not found or forbidden" }, { status: 404 });
    }

    const body = await request.json();
    const { type, categoryId, amount, date, personId, description, receiptUrl } = body;

    const transaction = await prisma.transaction.update({
        where: { id: params.id },
        data: {
            ...(type && { type }),
            ...(categoryId && { categoryId }),
            ...(amount !== undefined && { amount: Math.round(Number(amount)) }),
            ...(date && { date: new Date(date) }),
            ...(personId !== undefined && { personId: personId || null }),
            ...(description !== undefined && { description }),
            ...(receiptUrl !== undefined && { receiptUrl }),
        },
        include: {
            clan: { select: { id: true, name: true } },
            person: { select: { id: true, fullName: true, code: true } },
        },
    });

    return NextResponse.json(transaction);
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    if (!isAdmin(user.role)) return forbidden();

    const existing = await prisma.transaction.findUnique({
        where: { id: params.id },
    });
    if (!existing || !hasClanAccess(user, existing.clanId)) {
        return NextResponse.json({ error: "Transaction not found or forbidden" }, { status: 404 });
    }

    await prisma.transaction.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
}

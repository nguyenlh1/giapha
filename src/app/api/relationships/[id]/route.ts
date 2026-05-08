import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, unauthorized, forbidden, canWrite } from "@/lib/rbac";

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    if (!canWrite(user.role)) return forbidden();

    await prisma.relationship.delete({
        where: { id: params.id },
    });

    return NextResponse.json({ success: true });
}

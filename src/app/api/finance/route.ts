import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, unauthorized, forbidden, canWrite, hasClanAccess } from "@/lib/rbac";

export async function GET(request: NextRequest) {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const clanId = searchParams.get("clanId");
    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = {};
    if (user.clanId) {
        where.clanId = user.clanId;
    } else if (clanId) {
        where.clanId = clanId;
    }

    if (type) where.type = type;
    if (category) where.categoryId = category;
    if (dateFrom || dateTo) {
        where.date = {};
        if (dateFrom) where.date.gte = new Date(dateFrom);
        if (dateTo) where.date.lte = new Date(dateTo);
    }

    const [transactions, total] = await Promise.all([
        prisma.transaction.findMany({
            where,
            include: {
                clan: { select: { id: true, name: true } },
                person: { select: { id: true, fullName: true, code: true } },
                category: { select: { id: true, name: true, type: true } },
            },
            skip,
            take: limit,
            orderBy: { date: "desc" },
        }),
        prisma.transaction.count({ where }),
    ]);

    return NextResponse.json({ transactions, total, page, limit });
}

export async function POST(request: NextRequest) {
    const user = await getSessionUser();
    if (!user) return unauthorized();
    if (!canWrite(user.role)) return forbidden();

    const body = await request.json();
    const { clanId, type, category, amount, date, personId, description, receiptUrl } = body;

    if (!clanId || !type || !amount || !date || !category) {
        return NextResponse.json(
            { error: "clanId, type, amount, date, and category (id) are required" },
            { status: 400 }
        );
    }

    // Verify category exists and matches type
    const financeCategory = await prisma.financeCategory.findFirst({
        where: { id: category, clanId }
    });

    if (!financeCategory) {
        return NextResponse.json({ error: "Category not found" }, { status: 400 });
    }

    if (financeCategory.type !== type) {
        return NextResponse.json({ error: "Category type mismatch" }, { status: 400 });
    }

    if (!hasClanAccess(user, clanId)) return forbidden();

    const transaction = await prisma.transaction.create({
        data: {
            clanId,
            type: type as any,
            categoryId: category,
            amount: Math.round(Number(amount)),
            date: new Date(date),
            personId: personId || null,
            description: description || null,
            receiptUrl: receiptUrl || null,
            createdBy: user.id,
        },
        include: {
            clan: { select: { id: true, name: true } },
            person: { select: { id: true, fullName: true, code: true } },
        },
    });

    return NextResponse.json(transaction, { status: 201 });
}

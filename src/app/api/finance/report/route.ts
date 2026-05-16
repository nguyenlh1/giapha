import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, unauthorized } from "@/lib/rbac";

import { CATEGORY_LABELS } from "@/lib/constants";

export async function GET(request: NextRequest) {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const clanId = searchParams.get("clanId");
    const type = searchParams.get("type");
    const category = searchParams.get("category");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

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

    // Aggregate by category dynamically
    const breakdownWhere = { ...where };
    if (!breakdownWhere.type) breakdownWhere.type = "EXPENSE"; // default for the pie chart

    const categoryBreakdown = await prisma.transaction.groupBy({
        by: ["categoryId"],
        _sum: { amount: true },
        _count: true,
        where: breakdownWhere,
    });

    // Fetch the names
    const categoryIds = categoryBreakdown.map(c => c.categoryId);
    const categories = await prisma.financeCategory.findMany({
        where: { id: { in: categoryIds } }
    });

    const categoryData = categoryBreakdown.map((item: any) => {
        const cat = categories.find((c: any) => c.id === item.categoryId);
        return {
            category: item.categoryId,
            labelVi: cat?.name || "Unknown",
            labelEn: cat?.name || "Unknown",
            total: Number(item._sum.amount || 0),
            count: item._count,
        };
    });

    // Period totals
    const [periodContrib, periodExpense] = await Promise.all([
        prisma.transaction.aggregate({
            _sum: { amount: true },
            _count: true,
            where: { ...where, type: "CONTRIBUTION" },
        }),
        prisma.transaction.aggregate({
            _sum: { amount: true },
            _count: true,
            where: { ...where, type: "EXPENSE" },
        }),
    ]);

    return NextResponse.json({
        categoryData,
        periodSummary: {
            totalContributions: Number(periodContrib._sum.amount || 0),
            contributionCount: periodContrib._count,
            totalExpenses: Number(periodExpense._sum.amount || 0),
            expenseCount: periodExpense._count,
            balance:
                Number(periodContrib._sum.amount || 0) -
                Number(periodExpense._sum.amount || 0),
        },
    });
}

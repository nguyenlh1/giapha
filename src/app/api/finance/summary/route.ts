import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, unauthorized } from "@/lib/rbac";

export async function GET(request: NextRequest) {
    const user = await getSessionUser();
    if (!user) return unauthorized();

    const { searchParams } = new URL(request.url);
    const clanId = searchParams.get("clanId");

    const where: any = {};
    if (user.clanId) {
        where.clanId = user.clanId;
    } else if (clanId) {
        where.clanId = clanId;
    }

    // Total contributions & expenses
    const [contributions, expenses] = await Promise.all([
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

    const totalContributions = Number(contributions._sum.amount || 0);
    const totalExpenses = Number(expenses._sum.amount || 0);
    const balance = totalContributions - totalExpenses;

    // This month's transactions
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthCount = await prisma.transaction.count({
        where: { ...where, date: { gte: startOfMonth } },
    });

    // Monthly chart data (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

        const [monthContrib, monthExp] = await Promise.all([
            prisma.transaction.aggregate({
                _sum: { amount: true },
                where: {
                    ...where,
                    type: "CONTRIBUTION",
                    date: { gte: monthStart, lte: monthEnd },
                },
            }),
            prisma.transaction.aggregate({
                _sum: { amount: true },
                where: {
                    ...where,
                    type: "EXPENSE",
                    date: { gte: monthStart, lte: monthEnd },
                },
            }),
        ]);

        monthlyData.push({
            month: `${monthStart.getMonth() + 1}/${monthStart.getFullYear()}`,
            contributions: Number(monthContrib._sum.amount || 0),
            expenses: Number(monthExp._sum.amount || 0),
        });
    }

    return NextResponse.json({
        totalContributions,
        totalExpenses,
        balance,
        thisMonthCount,
        monthlyData,
    });
}

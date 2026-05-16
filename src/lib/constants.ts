export const CATEGORY_LABELS: Record<string, { vi: string; en: string }> = {
    ANNIVERSARY: { vi: "Lễ giỗ", en: "Anniversary" },
    CONSTRUCTION: { vi: "Xây dựng", en: "Construction" },
    SCHOLARSHIP: { vi: "Khuyến học", en: "Scholarship" },
    REPAIR: { vi: "Sửa chữa", en: "Repair" },
    CHARITY: { vi: "Từ thiện", en: "Charity" },
    EVENT: { vi: "Sự kiện", en: "Event" },
    ANNUAL_FUND: { vi: "Quỹ thường niên", en: "Annual Fund" },
    DONATION: { vi: "Công đức", en: "Donation" },
    WELFARE: { vi: "Thăm hỏi / Hiếu hỷ", en: "Welfare" },
    OTHER: { vi: "Khác", en: "Other" },
};

export const CONTRIBUTION_CATEGORIES = [
    "ANNUAL_FUND",
    "DONATION",
    "EVENT",
    "CONSTRUCTION",
    "OTHER"
];

export const EXPENSE_CATEGORIES = [
    "ANNIVERSARY",
    "CONSTRUCTION",
    "REPAIR",
    "SCHOLARSHIP",
    "WELFARE",
    "CHARITY",
    "EVENT",
    "OTHER"
];

import "server-only";

export type Locale = "en" | "vi";

const dictionaries = {
    en: () => import("./dictionaries/en.json").then((module) => module.default),
    vi: () => import("./dictionaries/vi.json").then((module) => module.default),
};

export const getDictionary = async (locale: Locale) => {
    return dictionaries[locale]?.() ?? dictionaries.vi();
};

export type Dictionary = Awaited<ReturnType<typeof getDictionary>>;

import { getTranslations } from "next-intl/server";
export default async function DashboardLoading() { const t = await getTranslations("Dashboard"); return <main className="main dashboard"><div className="skeleton" aria-label={t("loading")}><i style={{ width: "28%" }} /><i style={{ width: "64%" }} /><i style={{ width: "92%", height: "8rem" }} /></div></main>; }

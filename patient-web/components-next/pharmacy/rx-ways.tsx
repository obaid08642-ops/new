import { getTranslations } from "next-intl/server";
import { ChipLink } from "./chip-link";
import rx from "./rx.module.css";

export type RxWay = "photo" | "upload" | "type";

/** The three ways into "order with a prescription" (photograph, upload, type the names): plain links, the way is in the URL as `?via=`. */
export async function RxWays({ locale, via }: { locale: string; via: RxWay }) {
  const t = await getTranslations({ locale, namespace: "RxUpload" });
  const ways: RxWay[] = ["photo", "upload", "type"];
  const label: Record<RxWay, string> = { photo: t("viaPhoto"), upload: t("viaUpload"), type: t("viaType") };
  return (
    <nav aria-label={t("waysLabel")} className={rx.chips}>
      {ways.map((way) => (
        <ChipLink key={way} href={`/${locale}/pharmacy/rx-order?via=${way}`} label={label[way]} selected={way === via} />
      ))}
    </nav>
  );
}

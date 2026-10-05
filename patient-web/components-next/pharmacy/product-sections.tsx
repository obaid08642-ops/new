"use client";

import { useId, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components-next/ui-generated/src/Icon";
import styles from "./product-detail.module.css";

export type DetailSection = { id: string; title: string; items: string[] };
export type DetailGroup = { id: string; title: string; sections: DetailSection[] };

const WIDE = "(min-width: 768px)";
function subscribe(onChange: () => void) {
  const query = window.matchMedia(WIDE);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
/** Tabs from 768 (canvas/ProductWeb), an accordion below (canvas/ProductFull); phones are what the server draws. */
function useWide() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(WIDE).matches, () => false);
}

/**
 * The medicine details. Every section's text is in the page's HTML whichever way it is drawn (the page is indexed);
 * only the groups with something to say are here, and on a phone the first section starts open (spec A, "Accordion").
 */
export function ProductSections({ groups, label }: { groups: DetailGroup[]; label: string }) {
  const base = useId();
  const wide = useWide();
  const [tab, setTab] = useState(groups[0]?.id);
  const [open, setOpen] = useState<Set<string>>(() => new Set(groups[0]?.sections[0] ? [groups[0].sections[0].id] : []));

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  return (
    <div className={styles.sections}>
      <div role="tablist" aria-label={label} className={styles.tabs}>
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            role="tab"
            id={`${base}-tab-${group.id}`}
            aria-selected={tab === group.id}
            aria-controls={`${base}-panel-${group.id}`}
            tabIndex={wide && tab !== group.id ? -1 : undefined}
            className={`${styles.tab} ${tab === group.id ? styles.tabOn : ""}`}
            onClick={() => setTab(group.id)}
          >
            {group.title}
          </button>
        ))}
      </div>
      {groups.map((group) => (
        <div
          key={group.id}
          id={`${base}-panel-${group.id}`}
          role={wide ? "tabpanel" : undefined}
          aria-labelledby={wide ? `${base}-tab-${group.id}` : undefined}
          data-active={tab === group.id}
          className={styles.panel}
        >
          {group.sections.map((section) => {
            const isOpen = open.has(section.id);
            const body = (
              <ul className={styles.bullets}>
                {section.items.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            );
            return (
              <section key={section.id} data-open={wide ? "true" : String(isOpen)} className={styles.section}>
                {wide ? (
                  <h3 className={styles.sectionTitle}>{section.title}</h3>
                ) : (
                  <h3 className={styles.sectionHead}>
                    <button
                      type="button"
                      className={styles.sectionButton}
                      aria-expanded={isOpen}
                      aria-controls={`${base}-body-${section.id}`}
                      onClick={() => toggle(section.id)}
                    >
                      <span className={styles.sectionName}>{section.title}</span>
                      {section.items.length > 1 ? <span className={styles.sectionCount}>{section.items.length}</span> : null}
                      <Icon name={isOpen ? "caret-up" : "caret-down"} size={18} tone="secondary" />
                    </button>
                  </h3>
                )}
                <div id={`${base}-body-${section.id}`} className={styles.sectionBody}>{body}</div>
              </section>
            );
          })}
        </div>
      ))}
    </div>
  );
}

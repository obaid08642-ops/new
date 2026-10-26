"use client";

import { useRef, useState, type ComponentType, type ReactNode } from "react";
import type { SuggestScope } from "@/lib/search/suggest";

interface Props {
  locale: string;
  scope?: SuggestScope;
  id: string;
  name: string;
  defaultValue?: string;
  placeholder: string;
  label: string;
  fieldClassName: string;
  inputClassName: string;
  wrapClassName?: string;
  children?: ReactNode;
}
type LiveProps = Props & { focusOnMount?: boolean };

/**
 * A GET-form search input of a server-rendered page. It is a plain field (no script cost on load); the first time it is
 * focused the live suggestions of its service load and take its place (same field, same text, caret kept).
 */
export function SuggestInput(props: Props) {
  const [Live, setLive] = useState<ComponentType<LiveProps> | null>(null);
  const [value, setValue] = useState(props.defaultValue ?? "");
  const loading = useRef(false);
  if (Live) return <Live {...props} defaultValue={value} focusOnMount />;
  const load = () => {
    if (loading.current) return;
    loading.current = true;
    void import("./suggest-input-live").then((m) => setLive(() => m.SuggestInputLive));
  };
  return (
    <label className={props.fieldClassName}>
      {props.children}
      <span className="sr-only">{props.label}</span>
      <input
        id={props.id}
        name={props.name}
        type="search"
        defaultValue={props.defaultValue}
        placeholder={props.placeholder}
        className={props.inputClassName}
        autoComplete="off"
        onFocus={load}
        onChange={(event) => setValue(event.target.value)}
      />
    </label>
  );
}

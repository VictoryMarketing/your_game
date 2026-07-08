import type { CSSProperties } from "react";
import type { UserItem } from "../api/types";

export function itemSpriteStyle(item: Pick<UserItem, "icon_index"> | undefined): CSSProperties {
  const index = Math.max(0, Number(item?.icon_index || 0));
  const col = index % 6;
  const row = Math.floor(index / 6);
  return {
    "--sprite-x": `${(col / 5) * 100}%`,
    "--sprite-y": `${(row / 2) * 100}%`,
  } as CSSProperties;
}


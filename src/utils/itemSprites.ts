import type { CSSProperties } from "react";
import type { UserItem } from "../api/types";

export function itemSpriteStyle(item: Pick<UserItem, "icon_index"> | undefined): CSSProperties {
  const typed = item as Pick<UserItem, "icon_index" | "image_path"> | undefined;
  const imagePath = typed?.image_path || "";
  const imageUrl = imagePath ? `${import.meta.env.BASE_URL}${imagePath}` : `${import.meta.env.BASE_URL}images/items/item-spritesheet.webp`;
  return {
    "--item-image": `url("${imageUrl}")`,
  } as CSSProperties;
}

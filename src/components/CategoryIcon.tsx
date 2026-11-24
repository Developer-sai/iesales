import { Baby, Cpu, House, Plane, Shirt, ShoppingBasket, Tag } from "lucide-react";
import type { Category } from "@/lib/types";

export function CategoryIcon({ category, size = 14 }: { category: Category; size?: number }) {
  const props = { size, "aria-hidden": true as const };
  switch (category) {
    case "tech": return <Cpu {...props} />;
    case "home": return <House {...props} />;
    case "fashion": return <Shirt {...props} />;
    case "grocery": return <ShoppingBasket {...props} />;
    case "kids": return <Baby {...props} />;
    case "travel": return <Plane {...props} />;
    default: return <Tag {...props} />;
  }
}

import { Briefcase, HeartPulse, House, Plane, Users, type LucideIcon } from "lucide-react";

/**
 * One look per scenario category, so scenarios created in the admin studio get
 * a banner automatically. The photos are the ones used in the design.
 */
const VISUALS: Record<string, { icon: LucideIcon; photo: string }> = {
  "Daily Life": { icon: House, photo: "photo-1414235077428-338989a2e8c0" },
  Travel: { icon: Plane, photo: "photo-1436491865332-7a61a109cc05" },
  Business: { icon: Briefcase, photo: "photo-1573497491208-6b1acb260507" },
  Social: { icon: Users, photo: "photo-1521017432531-fbd92d768814" },
  Emergency: { icon: HeartPulse, photo: "photo-1631815589968-fdb09a223b1e" },
};

export function categoryVisual(category: string | null | undefined) {
  const v = VISUALS[category ?? ""] ?? VISUALS["Daily Life"];
  return {
    icon: v.icon,
    photoUrl: (w: number, h: number) => `https://images.unsplash.com/${v.photo}?w=${w}&h=${h}&fit=crop&auto=format`,
  };
}

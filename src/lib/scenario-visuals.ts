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

/** Own photo for each default scenario, so cards in one category don't repeat. */
const TITLE_PHOTOS: Record<string, string> = {
  "ordering at a restaurant": "photo-1414235077428-338989a2e8c0",
  "buying groceries": "photo-1542838132-92c53300491e",
  "asking for directions": "photo-1488646953014-85cb44e25828",
  "checking into a hotel": "photo-1566073771259-6a8506099945",
  "job interview": "photo-1521791136064-7986c2920216",
  "meeting a new colleague": "photo-1522071820081-009f0129c71c",
  "making friends at a party": "photo-1529156069898-49953e39b3ac",
  "visiting a doctor": "photo-1576091160399-112ba8d25d1d",
  "lost wallet": "photo-1453873531674-2151bcd01707",
};

export function categoryVisual(category: string | null | undefined, title?: string | null) {
  const v = VISUALS[category ?? ""] ?? VISUALS["Daily Life"];
  const photo = TITLE_PHOTOS[(title ?? "").trim().toLowerCase()] ?? v.photo;
  return {
    icon: v.icon,
    photoUrl: (w: number, h: number) => `https://images.unsplash.com/${photo}?w=${w}&h=${h}&fit=crop&auto=format`,
  };
}

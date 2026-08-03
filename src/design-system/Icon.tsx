import type { SVGProps } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Home,
  MapPin,
  Calendar,
  Copy,
  RefreshCw,
  LogOut,
  X,
  Menu,
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  Pencil,
  Trash2,
  Bookmark,
  Share2,
  MoreHorizontal,
  MoreVertical,
  Check,
  Info,
  TriangleAlert,
  CircleAlert,
  User,
  Settings,
  Bell,
  Heart,
  Star,
  MessageCircle,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";
import { type IconName, type IconSize } from "./tokens";

/** design-system icon name → Lucide component */
export const ICON_MAP: Record<IconName, LucideIcon> = {
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "arrow-up": ArrowUp,
  "arrow-down": ArrowDown,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  "chevron-up": ChevronUp,
  "chevron-down": ChevronDown,
  home: Home,
  "map-pin": MapPin,
  calendar: Calendar,
  copy: Copy,
  refresh: RefreshCw,
  logout: LogOut,
  close: X,
  menu: Menu,
  search: Search,
  filter: Filter,
  sort: ArrowUpDown,
  plus: Plus,
  edit: Pencil,
  delete: Trash2,
  bookmark: Bookmark,
  share: Share2,
  "more-horizontal": MoreHorizontal,
  "more-vertical": MoreVertical,
  check: Check,
  info: Info,
  warning: TriangleAlert,
  error: CircleAlert,
  user: User,
  settings: Settings,
  notification: Bell,
  heart: Heart,
  star: Star,
  comment: MessageCircle,
  image: ImageIcon,
};

export type IconProps = {
  name: IconName;
  /** 16 · 20 · 24 · 32 per the design system (any number allowed) */
  size?: IconSize | number;
  strokeWidth?: number;
  color?: string;
  className?: string;
} & Omit<SVGProps<SVGSVGElement>, "ref" | "name" | "color">;

export function Icon({
  name,
  size = 24,
  strokeWidth = 2,
  color = "currentColor",
  ...rest
}: IconProps) {
  const Cmp = ICON_MAP[name];
  if (!Cmp) return null;
  return (
    <Cmp size={size} strokeWidth={strokeWidth} color={color} aria-hidden {...rest} />
  );
}

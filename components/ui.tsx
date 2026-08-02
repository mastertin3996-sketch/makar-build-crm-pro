import Link from "next/link";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import type { RequestStatus } from "@prisma/client";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/labels";
import { Icon, type IconName } from "@/components/icons";

// ----------------------------------------------------------------------------
// Іконки платформ (реальні бренд-логотипи замість емодзі, де це можливо)
// ----------------------------------------------------------------------------
const PLATFORM_ICON_SRC: Record<string, string> = {
  TELEGRAM: "/icons/telegram.svg",
  VIBER: "/icons/viber.svg",
  WHATSAPP: "/icons/whatsapp.svg",
  INSTAGRAM: "/icons/instagram.svg",
  FACEBOOK: "/icons/facebook.svg",
};

// Рендерить реальний логотип бренду (Telegram/Viber/WhatsApp/Instagram/Facebook) —
// автентичні бренд-кольори лишаються як є (не золотяться) заради впізнаваності;
// для каналів без офіційного лого (Email, SMS, маркетплейси тощо) — фолбек-емодзі.
export function PlatformIcon({
  id,
  fallback,
  size = 18,
  className = "",
}: {
  id: string;
  fallback: ReactNode;
  size?: number;
  className?: string;
}) {
  const src = PLATFORM_ICON_SRC[id];
  if (!src) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- маленька статична SVG-іконка, оптимізація Image тут зайва
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className={`inline-block shrink-0 align-middle ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

// ----------------------------------------------------------------------------
// Layout
// ----------------------------------------------------------------------------
export function PageHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: IconName;
}) {
  return (
    <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-brand/10 bg-background/90 px-8 py-5 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10">
            <Icon name={icon} className="h-5 w-5 text-[#b8935a]" />
          </span>
        )}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Поверхні
// ----------------------------------------------------------------------------
export function Card({
  children,
  className = "",
  hoverable = false,
}: {
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
}) {
  return (
    <div
      className={`card-border rounded-xl p-[3px] shadow-card transition-shadow ${
        hoverable ? "hover:shadow-card-hover" : ""
      }`}
    >
      <div className={`rounded-[9px] bg-surface ${className}`}>{children}</div>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon?: IconName;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-6 py-14 text-center">
      {icon && <Icon name={icon} className="mb-2 h-8 w-8 text-brand/50" />}
      <div className="text-sm font-medium text-muted">{title}</div>
      {hint && <div className="text-xs text-muted/70">{hint}</div>}
    </div>
  );
}

// Рядок-заглушка для порожньої таблиці (усередині <tbody>)
export function EmptyRow({
  colSpan,
  children,
}: {
  colSpan: number;
  children: ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-6 py-14 text-center text-sm text-muted">
        {children}
      </td>
    </tr>
  );
}

// ----------------------------------------------------------------------------
// Бейджі
// ----------------------------------------------------------------------------
export function Badge({
  children,
  className = "",
  dot = false,
}: {
  children: ReactNode;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <Badge className={STATUS_COLORS[status]} dot>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

// ----------------------------------------------------------------------------
// Кнопки
// ----------------------------------------------------------------------------
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50";

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: "gold-metal focus-visible:ring-brand",
  secondary:
    "border border-brand/25 bg-transparent text-foreground hover:bg-brand/10 hover:border-brand/40 focus-visible:ring-brand/50",
  ghost: "text-muted hover:bg-white/5 hover:text-foreground focus-visible:ring-brand/40",
  danger: "bg-red-600/90 text-white hover:bg-red-600 focus-visible:ring-red-500",
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
      {...props}
    />
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <Link
      href={href}
      className={`${BUTTON_BASE} ${BUTTON_VARIANTS[variant]} ${BUTTON_SIZES[size]} ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
}

// ----------------------------------------------------------------------------
// Форми
// ----------------------------------------------------------------------------
const FIELD_INPUT =
  "w-full rounded-lg border border-brand/15 bg-black/25 px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted/70 focus:border-brand disabled:bg-black/10 disabled:text-muted";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${FIELD_INPUT} ${className}`} {...props} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${FIELD_INPUT} ${className}`} {...props} />;
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${FIELD_INPUT} ${className}`} {...props} />;
}

// Підписане текстове поле (найпоширеніший патерн у формах додавання)
export function Field({
  name,
  label,
  className = "",
  ...inputProps
}: {
  name: string;
  label: string;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "className">) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      <Input name={name} {...inputProps} />
    </label>
  );
}

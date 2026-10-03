import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { CircleNotch } from '@phosphor-icons/react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'track' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

/* Track red is the primary action everywhere (the app contract). Its text
   measures 4.5:1 on track red and more on hover, which darkens rather than
   brightens (a brighter red would drop below AA). `track` is an alias. */
const variants: Record<Variant, string> = {
  primary: 'bg-track text-track-ink hover:bg-[#a23a24]',
  track: 'bg-track text-track-ink hover:bg-[#a23a24]',
  secondary: 'bg-transparent text-lane border border-lane-line-strong hover:border-lane-dim hover:bg-night-800',
  ghost: 'bg-transparent text-lane-dim hover:text-lane hover:bg-night-800',
  danger: 'bg-transparent text-dnf border border-dnf/40 hover:bg-dnf/10 hover:border-dnf',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5',
  md: 'h-11 px-5 text-[14px] gap-2',
  lg: 'h-13 px-7 text-[15px] gap-2.5',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, icon, className, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full font-semibold tracking-[0.005em]',
        'transition-[background-color,border-color,color,transform] duration-200 ease-out-quart',
        'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-45',
        'min-h-11 sm:min-h-0',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <CircleNotch className="size-4 animate-spin" weight="bold" aria-hidden /> : icon}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[4px] text-sm font-bold transition-all duration-75 active:scale-[0.98] active:translate-y-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:shadow-none hover:-translate-y-0.5",
  {
    variants: {
      variant: {
        default: "bg-orange-500 text-white shadow-[0_4px_0_0_#c2410c] border border-orange-600 hover:bg-orange-400 hover:shadow-[0_6px_0_0_#c2410c]",
        destructive: "bg-red-500 text-white shadow-[0_4px_0_0_#991b1b] border border-red-600 hover:bg-red-400 hover:shadow-[0_6px_0_0_#991b1b] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline: "bg-background border-2 border-slate-700 shadow-[0_4px_0_0_#334155] text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-600 hover:shadow-[0_6px_0_0_#475569]",
        secondary: "bg-slate-800 text-white shadow-[0_4px_0_0_#0f172a] border border-slate-900 hover:bg-slate-700 hover:shadow-[0_6px_0_0_#0f172a]",
        ghost: "hover:bg-white/5 hover:text-white text-slate-400",
        link: "text-orange-500 underline-offset-4 hover:underline shadow-none bg-transparent border-0 active:translate-y-0 hover:-translate-y-0 active:scale-100",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        xs: "h-6 gap-1 rounded-[3px] px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 rounded-[3px] gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-[4px] px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-xs": "size-6 rounded-[3px] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

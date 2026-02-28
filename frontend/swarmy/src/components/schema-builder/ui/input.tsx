import * as React from "react"

import { cn } from "../utils/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-9 w-full border border-input bg-n-900 px-3 py-2 text-[13px] font-[family-name:var(--font-mono)] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-foreground disabled:cursor-not-allowed disabled:opacity-50 transition-colors",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }

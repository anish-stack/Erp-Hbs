import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2",
    "whitespace-nowrap rounded-md text-sm font-medium",
    "transition-colors",
    "focus-visible:outline-none focus-visible:ring-2",
    "focus-visible:ring-ring focus-visible:ring-offset-1",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:size-4 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        // ---------------------------------------------------
        // DEFAULT
        // ---------------------------------------------------
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",

        // ---------------------------------------------------
        // DESTRUCTIVE
        // ---------------------------------------------------
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",

        // ---------------------------------------------------
        // SUCCESS
        // ---------------------------------------------------
        success:
          "bg-green-600 text-white shadow-sm hover:bg-green-700 focus-visible:ring-green-600",

        // ---------------------------------------------------
        // WARNING
        // ---------------------------------------------------
        warning:
          "bg-amber-500 text-white shadow-sm hover:bg-amber-600 focus-visible:ring-amber-500",

        // ---------------------------------------------------
        // INFO
        // ---------------------------------------------------
        info:
          "bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus-visible:ring-blue-600",

        // ---------------------------------------------------
        // DANGER
        // ---------------------------------------------------
        danger:
          "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-600",

        // ---------------------------------------------------
        // DOWNLOAD
        // ---------------------------------------------------
        download:
          "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 focus-visible:ring-emerald-600",

        // ---------------------------------------------------
        // UPLOAD
        // ---------------------------------------------------
        upload:
          "bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 focus-visible:ring-indigo-600",

        // ---------------------------------------------------
        // EDIT
        // ---------------------------------------------------
        edit:
          "bg-violet-600 text-white shadow-sm hover:bg-violet-700 focus-visible:ring-violet-600",

        // ---------------------------------------------------
        // APPROVE
        // ---------------------------------------------------
        approve:
          "bg-green-600 text-white shadow-sm hover:bg-green-700 focus-visible:ring-green-600",

        // ---------------------------------------------------
        // REJECT
        // ---------------------------------------------------
        reject:
          "bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-600",

        // ---------------------------------------------------
        // OUTLINE
        // ---------------------------------------------------
        outline:
          "border border-input bg-card shadow-sm hover:bg-accent hover:text-accent-foreground",

        // ---------------------------------------------------
        // SECONDARY
        // ---------------------------------------------------
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",

        // ---------------------------------------------------
        // GHOST
        // ---------------------------------------------------
        ghost:
          "hover:bg-accent hover:text-accent-foreground",

        // ---------------------------------------------------
        // LINK
        // ---------------------------------------------------
        link:
          "text-primary underline-offset-4 hover:underline",

        // ---------------------------------------------------
        // SOFT VARIANTS
        // ---------------------------------------------------
        "soft-success":
          "bg-green-100 text-green-700 hover:bg-green-200",

        "soft-warning":
          "bg-amber-100 text-amber-700 hover:bg-amber-200",

        "soft-info":
          "bg-blue-100 text-blue-700 hover:bg-blue-200",

        "soft-danger":
          "bg-red-100 text-red-700 hover:bg-red-200",

        "soft-primary":
          "bg-primary/10 text-primary hover:bg-primary/20",

        // ---------------------------------------------------
        // DARK
        // ---------------------------------------------------
        dark:
          "bg-slate-900 text-white shadow-sm hover:bg-slate-800",

        // ---------------------------------------------------
        // LIGHT
        // ---------------------------------------------------
        light:
          "bg-slate-100 text-slate-900 shadow-sm hover:bg-slate-200",
      },

      size: {
        default:
          "h-9 px-4 py-2",

        sm:
          "h-8 rounded-md px-3 text-xs",

        lg:
          "h-10 rounded-md px-6",

        xl:
          "h-11 rounded-md px-8",

        icon:
          "h-9 w-9",

        "icon-sm":
          "h-8 w-8",

        "icon-lg":
          "h-10 w-10",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

const Button = React.forwardRef(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(
          buttonVariants({
            variant,
            size,
            className,
          }),
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export {
  Button,
  buttonVariants,
};
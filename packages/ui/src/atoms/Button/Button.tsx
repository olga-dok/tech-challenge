import type { ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva(
    "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                primary:
                    "bg-black text-white hover:bg-gray-800",
                secondary:
                    "bg-gray-100 text-gray-900 hover:bg-gray-200",
                outline:
                    "border border-gray-300 bg-white text-gray-900 hover:bg-gray-50",
                ghost:
                    "bg-transparent text-gray-900 hover:bg-gray-100",
            },
            size: {
                sm: "h-8 px-3",
                md: "h-10 px-4",
                lg: "h-12 px-6",
            },
        },
        defaultVariants: {
            variant: "primary",
            size: "md",
        },
    },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
    VariantProps<typeof buttonVariants>;

export function Button({
                           className,
                           variant,
                           size,
                           ...props
                       }: ButtonProps) {
    return (
        <button
            className={buttonVariants({ variant, size, className })}
            {...props}
        />
    );
}
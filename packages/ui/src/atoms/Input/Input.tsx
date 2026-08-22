import type { InputHTMLAttributes } from "react";

export function Input({
                          className = "",
                          ...props
                      }: InputHTMLAttributes<HTMLInputElement>) {
    return (
        <input
            className={`h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm outline-none transition-colors placeholder:text-gray-400 focus:border-gray-500 focus:ring-2 focus:ring-gray-200 ${className}`}
            {...props}
        />
    );
}
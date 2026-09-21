/**
 * cn：className 合并工具（shadcn / Rare UI 约定）
 * - clsx：条件类名拼接
 * - tailwind-merge：解决 Tailwind 类冲突（后者覆盖前者）
 */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

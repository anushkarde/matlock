"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("relative block h-6 w-[140px]", className)}>
      <Image
        src="/logo-light.png"
        alt="Logo"
        fill
        className="object-contain dark:hidden"
        priority
      />
      <Image
        src="/logo-dark.png"
        alt="Logo"
        fill
        className="hidden object-contain dark:block"
        priority
      />
    </span>
  )
}
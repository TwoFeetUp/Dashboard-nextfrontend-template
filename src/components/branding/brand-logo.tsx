import Image from "next/image"

import { cn } from "@/lib/utils"

interface BrandLogoProps {
  showText?: boolean
  className?: string
  imageClassName?: string
}

export function BrandLogo({ showText = true, className, imageClassName }: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src="/branding/logo.png"
        alt="Company logo"
        width={48}
        height={48}
        priority
        className={cn("h-12 w-12 object-contain", imageClassName)}
      />
      {showText ? (
        <div className="flex flex-col leading-tight">
          <span className="text-base font-semibold text-gray-900">[COMPANY_NAME]</span>
          <span className="text-xs uppercase tracking-wide text-gray-500">[LOCATION]</span>
        </div>
      ) : null}
    </div>
  )
}

import { cn } from "@/lib/utils"

interface BrandLogoProps {
  showText?: boolean
  className?: string
  imageClassName?: string
}

export function BrandLogo({ showText = true, className, imageClassName }: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/branding/Logo LHT.png"
        alt="Hoogtij logo"
        className={cn("h-12 w-auto object-contain", imageClassName)}
      />
      {showText ? (
        <div className="flex flex-col leading-tight">
          <span className="text-base font-semibold text-lht-black">Hoogtij</span>
        </div>
      ) : null}
    </div>
  )
}

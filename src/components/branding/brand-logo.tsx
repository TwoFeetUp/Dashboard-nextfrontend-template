/* eslint-disable @next/next/no-img-element */
import { cn } from "@/lib/utils"

// TwoFeetUp CDN Logo URLs
const LOGO_URLS = {
  light: "https://twofeetup.github.io/Brand_Assets/logos/TwoFeetUp_Full_Logo_for_bright_backgrounds.png",
  dark: "https://twofeetup.github.io/Brand_Assets/logos/TwoFeetUp_Full_Logo_Diapositief_for_Dark_backgrounds.png",
  beeldmerk: "https://twofeetup.github.io/Brand_Assets/logos/TwoFeetUp_Beeldmerk.svg"
}

interface BrandLogoProps {
  /** Use "dark" variant on gradient/dark backgrounds, "light" (default) on white/grey backgrounds */
  variant?: "light" | "dark"
  showText?: boolean
  className?: string
  imageClassName?: string
  size?: "sm" | "md" | "lg"
}

export function BrandLogo({
  variant = "light",
  showText = false,
  className,
  imageClassName,
  size = "md"
}: BrandLogoProps) {
  const logoUrl = variant === "dark" ? LOGO_URLS.dark : LOGO_URLS.light

  const sizeClasses = {
    sm: "h-6",
    md: "h-8",
    lg: "h-12"
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src={logoUrl}
        alt="TwoFeetUp"
        className={cn(sizeClasses[size], "w-auto object-contain", imageClassName)}
      />
      {showText ? (
        <div className="flex flex-col leading-tight">
          <span className={cn(
            "text-base font-bold",
            variant === "dark" ? "text-white" : "text-tfu-black"
          )}>
            TwoFeetUp
          </span>
          <span className={cn(
            "text-xs uppercase tracking-wide font-light",
            variant === "dark" ? "text-white/70" : "text-tfu-black/60"
          )}>
            Demo
          </span>
        </div>
      ) : null}
    </div>
  )
}

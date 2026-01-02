'use client'

export function CardLoadingState() {
  return (
    <div className="animate-pulse space-y-4 p-4">
      <div className="h-4 bg-tfu-grey rounded w-3/4"></div>
      <div className="space-y-2">
        <div className="h-3 bg-tfu-grey rounded"></div>
        <div className="h-3 bg-tfu-grey rounded w-5/6"></div>
        <div className="h-3 bg-tfu-grey rounded w-4/6"></div>
      </div>
      <div className="h-32 bg-tfu-grey rounded"></div>
      <div className="h-3 bg-tfu-grey rounded w-1/4"></div>
    </div>
  )
}

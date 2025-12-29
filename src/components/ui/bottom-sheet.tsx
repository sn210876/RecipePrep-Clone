import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface BottomSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
  title?: string
}

export function BottomSheet({ open, onOpenChange, children, title }: BottomSheetProps) {
  const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768)

  React.useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  if (!isMobile) {
    return (
      <>
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        />
        <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2">
          <div className="bg-white rounded-lg shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
            {title && (
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">{title}</h2>
                <button
                  onClick={() => onOpenChange(false)}
                  className="rounded-full p-1 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
            <div className="overflow-y-auto flex-1">
              {children}
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={() => onOpenChange(false)}
      />
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "translate-y-full"
        )}
      >
        <div className="bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
          </div>

          {title && (
            <div className="flex items-center justify-between px-4 pb-3 border-b">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="overflow-y-auto flex-1 overscroll-contain">
            {children}
          </div>
        </div>
      </div>
    </>
  )
}

export function BottomSheetTrigger({
  children,
  onClick
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button onClick={onClick}>
      {children}
    </button>
  )
}

export function BottomSheetContent({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("p-4", className)}>
      {children}
    </div>
  )
}

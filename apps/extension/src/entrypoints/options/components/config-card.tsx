import { cn } from '@repo/ui/lib/utils'

export function ConfigCard(
  { title, description, children, className, titleClassName }:
  { title: React.ReactNode, description: React.ReactNode, children: React.ReactNode, className?: string, titleClassName?: string },
) {
  return (
    <section className={cn('py-6 flex lg:flex-row flex-col lg:gap-x-[50px] xl:gap-x-[100px] gap-y-6', className)}>
      <div className="lg:basis-2/5">
        <h2 className={cn('text-lg font-bold mb-1', titleClassName)}>{title}</h2>
        <div className="text-sm text-zinc-500">{description}</div>
      </div>
      <div className="lg:basis-3/5">
        {children}
      </div>
    </section>
  )
}

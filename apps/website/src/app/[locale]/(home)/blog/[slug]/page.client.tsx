'use client'

import { cn } from '@repo/ui/lib/utils'
import { buttonVariants } from 'fumadocs-ui/components/ui/button'
import { useCopyButton } from 'fumadocs-ui/utils/use-copy-button'
import { Check, Share } from 'lucide-react'

export function ShareButton({ url }: { url: string }) {
  const [isChecked, onCopy] = useCopyButton(() => {
    void navigator.clipboard.writeText(`${window.location.origin}${url}`)
  })

  return (
    <button
      type="button"
      className={cn(
        buttonVariants({ className: 'gap-2', color: 'secondary' }),
      )}
      onClick={onCopy}
    >
      {isChecked ? <Check className="size-4" /> : <Share className="size-4" />}
      {isChecked ? 'Copied URL' : 'Share Post'}
    </button>
  )
}

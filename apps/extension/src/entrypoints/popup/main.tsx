import type { Config } from '@/types/config/config.ts'
import { browser } from '#imports'
import { TooltipProvider } from '@repo/ui/components/tooltip'
import { QueryClientProvider } from '@tanstack/react-query'
import { Provider as JotaiProvider } from 'jotai'
import { useHydrateAtoms } from 'jotai/utils'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { configAtom } from '@/utils/atoms/config.ts'
import { getConfigFromStorage } from '@/utils/config/config.ts'
import { DEFAULT_CONFIG } from '@/utils/constants/config.ts'
import { sendMessage } from '@/utils/message.ts'
import { isDarkMode } from '@/utils/tailwind.ts'
import { queryClient } from '@/utils/trpc/client.ts'
import App from './app.tsx'
import { getIsInPatterns, isCurrentSiteInPatternsAtom, isPageTranslatedAtom } from './atoms/auto-translate.ts'
import '@/assets/tailwind/text-small.css'
import '@/assets/tailwind/theme.css'

document.documentElement.classList.toggle('dark', isDarkMode())
document.documentElement.style.colorScheme = isDarkMode() ? 'dark' : 'light'

function HydrateAtoms({
  initialValues,
  children,
}: {
  initialValues: [
    [typeof configAtom, Config],
    [typeof isPageTranslatedAtom, boolean],
    [typeof isCurrentSiteInPatternsAtom, boolean],
  ]
  children: React.ReactNode
}) {
  useHydrateAtoms(initialValues)
  return children
}

async function initApp() {
  const root = document.getElementById('root')!
  root.className = 'text-base antialiased w-[320px] bg-background'
  const config = (await getConfigFromStorage()) ?? DEFAULT_CONFIG

  const activeTab = await browser.tabs.query({
    active: true,
    currentWindow: true,
  })

  const tabId = activeTab[0].id

  let isPageTranslated: boolean = false
  if (tabId) {
    isPageTranslated
      = (await sendMessage('getEnablePageTranslation', {
        tabId,
      })) ?? false
  }

  const isInPatterns = tabId
    ? await getIsInPatterns(config.translate)
    : false

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <JotaiProvider>
          <HydrateAtoms
            initialValues={[
              [configAtom, config],
              [isPageTranslatedAtom, isPageTranslated],
              [isCurrentSiteInPatternsAtom, isInPatterns],
            ]}
          >
            <TooltipProvider>
              <App />
            </TooltipProvider>
          </HydrateAtoms>
        </JotaiProvider>
      </QueryClientProvider>
    </React.StrictMode>,
  )
}

void initApp()

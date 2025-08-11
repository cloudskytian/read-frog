import { auth } from '@repo/auth'
import { Button } from '@repo/ui/components/button'
import { headers } from 'next/headers'
import Link from 'next/link'
import { UserAvatar } from './user-avatar'

export async function UserAccount() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    return <LoginButton />
  }

  return (
    <UserAvatar user={session.user} />
  )
}

export function LoginButton() {
  return (
    <Button className="mx-2 bg-df-primary text-fd-popover-foreground hover:bg-fd-primary/80" asChild>
      <Link href="/log-in">Log in</Link>
    </Button>
  )
}

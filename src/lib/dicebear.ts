import { createAvatar } from '@dicebear/core'
import { bottts } from '@dicebear/collection'
import { avataaars } from '@dicebear/collection'
import { adventurer } from '@dicebear/collection'
import { bigSmile } from '@dicebear/collection'
import { funEmoji } from '@dicebear/collection'

const styles = {
  bottts,
  avataaars,
  adventurer,
  bigSmile,
  funEmoji
}

export type AvatarStyle = keyof typeof styles

export function makeAvatar(styleKey: AvatarStyle, seed: string, _size = 96) {
  const style = styles[styleKey] as any
  const avatar = createAvatar(style, { seed })
  return avatar.toDataUri()
}

export const availableStyles: AvatarStyle[] = ['bottts', 'avataaars', 'adventurer', 'bigSmile', 'funEmoji']


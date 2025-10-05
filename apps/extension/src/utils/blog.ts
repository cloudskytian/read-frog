import { storage } from '#imports'
import { z } from 'zod'
import { sendMessage } from './message'

const LAST_VIEWED_BLOG_DATE_KEY = 'lastViewedBlogDate'
const ONE_DAY_MS = 24 * 60 * 60 * 1000

/**
 * Semantic version regex pattern
 * Matches versions like: 1.0.0, 1.11, 10.20.30
 * Does NOT match: v1.0.0, 1.0.0-alpha, 1.-1.0
 */
const SEMANTIC_VERSION_REGEX = /^\d+(\.\d+)*$/

/**
 * Zod schema for semantic version validation
 * Exported for testing purposes
 */
export const semanticVersionSchema = z.string().regex(
  SEMANTIC_VERSION_REGEX,
  'Must be a valid semantic version (e.g., 1.0.0, 1.11, 10.20.30)',
).refine(
  (version) => {
    // Additional validation: ensure all parts are non-negative numbers
    const parts = version.split('.')
    return parts.every(part => !Number.isNaN(Number(part)) && Number(part) >= 0)
  },
  { message: 'Version parts must be non-negative numbers' },
)

/**
 * Zod schema for validating blog API response
 */
const blogApiResponseSchema = z.object({
  date: z.string(),
  title: z.string(),
  description: z.string(),
  url: z.string(),
  extensionVersion: semanticVersionSchema.nullable().optional(),
}).nullable()

/**
 * Saves the last viewed blog date to Chrome storage
 */
export async function saveLastViewedBlogDate(date: Date): Promise<void> {
  await storage.setItem(`local:${LAST_VIEWED_BLOG_DATE_KEY}`, date.toISOString())
}

/**
 * Retrieves the last viewed blog date from Chrome storage
 */
export async function getLastViewedBlogDate(): Promise<Date | null> {
  const dateStr = await storage.getItem<string>(`local:${LAST_VIEWED_BLOG_DATE_KEY}`)
  return dateStr ? new Date(dateStr) : null
}

/**
 * Checks if there's a new blog post by comparing last viewed date with latest blog date
 * and extension version compatibility
 * @param lastViewedDate - The last date the user viewed the blog
 * @param latestDate - The date of the latest blog post
 * @param currentExtensionVersion - Current extension version (e.g., "1.10.0")
 * @param blogExtensionVersion - Minimum extension version required for the blog post (e.g., "1.11.0")
 */
export function hasNewBlogPost(
  lastViewedDate: Date | null,
  latestDate: Date | null,
  currentExtensionVersion?: string,
  blogExtensionVersion?: string | null,
): boolean {
  if (!latestDate)
    return false

  // If blog post requires a specific extension version, check version compatibility
  if (blogExtensionVersion && currentExtensionVersion) {
    try {
      if (compareVersions(currentExtensionVersion, blogExtensionVersion) < 0) {
        // Current extension version is older than required version
        return false
      }
    }
    catch (error) {
      // Catch any error from version comparison (validation errors, unexpected errors, etc.)
      // Skip version check and proceed with date-only comparison
      if (error instanceof z.ZodError) {
        console.error('Version validation failed, skipping version check:', error.issues)
      }
      else {
        console.error('Version comparison failed, skipping version check:', error)
      }
    }
  }

  if (!lastViewedDate)
    return true
  return latestDate > lastViewedDate
}

/**
 * Compares two semantic version strings
 * @param v1 - First version string (e.g., "1.10.0")
 * @param v2 - Second version string (e.g., "1.11.0")
 * @returns -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 * @throws ZodError if either version string is invalid
 */
function compareVersions(v1: string, v2: string): number {
  // Validate using Zod schema
  semanticVersionSchema.parse(v1)
  semanticVersionSchema.parse(v2)

  const parts1 = v1.split('.').map(Number)
  const parts2 = v2.split('.').map(Number)

  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const part1 = parts1[i] || 0
    const part2 = parts2[i] || 0

    if (part1 < part2)
      return -1
    if (part1 > part2)
      return 1
  }

  return 0
}

/**
 * Fetches the latest blog post from the Read Frog blog API.
 * Uses background fetch with optional 1-day cache.
 *
 * @param apiUrl - The URL of the blog API endpoint (default: production URL)
 * @param locale - The locale to fetch the latest post for (default: 'en')
 * @param useCache - Whether to use cache (default: true)
 * @returns Promise resolving to the latest blog post data (date and extensionVersion), or null if no posts found
 *
 * @example
 * ```ts
 * const latestPost = await getLatestBlogDate('http://localhost:8888/api/blog/latest', 'en')
 * console.log(latestPost) // { date: Date, extensionVersion: '1.11.0' }
 *
 * // Without cache
 * const freshPost = await getLatestBlogDate('http://localhost:8888/api/blog/latest', 'en', false)
 * ```
 */
export async function getLatestBlogDate(
  apiUrl: string = 'https://readfrog.app/api/blog/latest',
  locale: string = 'en',
  useCache: boolean = true,
): Promise<{ date: Date, extensionVersion?: string | null } | null> {
  try {
    const url = new URL(apiUrl)
    url.searchParams.set('locale', locale)

    const response = await sendMessage('backgroundFetch', {
      url: url.toString(),
      method: 'GET',
      cacheConfig: useCache
        ? {
            enabled: true,
            groupKey: 'blog-fetch',
            ttl: ONE_DAY_MS,
          }
        : undefined,
    })

    if (response.status !== 200) {
      throw new Error(`Failed to fetch blog: ${response.status}`)
    }

    // Parse and validate response with Zod
    const parsedBody = JSON.parse(response.body)
    const validationResult = blogApiResponseSchema.safeParse(parsedBody)

    if (!validationResult.success) {
      throw new Error(`Invalid blog API response: ${validationResult.error.message}`)
    }

    const data = validationResult.data

    if (!data) {
      return null
    }

    return {
      date: new Date(data.date),
      extensionVersion: data.extensionVersion ?? null,
    }
  }
  catch (error) {
    console.error('Error fetching latest blog post:', error)
    return null
  }
}

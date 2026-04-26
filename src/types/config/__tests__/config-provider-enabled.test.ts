import { describe, expect, it } from "vitest"
import { DEFAULT_CONFIG } from "@/utils/constants/config"
import { DEFAULT_PROVIDER_CONFIG } from "@/utils/constants/providers"
import { configSchema } from "../config"

function getIssuePaths(input: unknown) {
  const result = configSchema.safeParse(input)
  if (result.success) {
    return []
  }

  return result.error.issues.map(issue => issue.path.join("."))
}

describe("config provider enabled validation", () => {
  it("fails when a built-in feature uses a disabled provider", () => {
    const providersConfig = DEFAULT_CONFIG.providersConfig.map((provider) => {
      if (provider.id === "microsoft-translate-default") {
        return { ...provider, enabled: false }
      }
      return provider
    })

    const issuePaths = getIssuePaths({
      ...DEFAULT_CONFIG,
      providersConfig,
    })

    expect(issuePaths).toContain("translate.providerId")
  })

  it("fails when a custom action uses a disabled provider", () => {
    const providersConfig = DEFAULT_CONFIG.providersConfig.map((provider) => {
      if (provider.id === "openai-default") {
        return { ...provider, enabled: false }
      }
      return provider
    })

    const issuePaths = getIssuePaths({
      ...DEFAULT_CONFIG,
      providersConfig,
      selectionToolbar: {
        ...DEFAULT_CONFIG.selectionToolbar,
        customActions: DEFAULT_CONFIG.selectionToolbar.customActions.map(action => ({
          ...action,
          providerId: "openai-default",
        })),
      },
    })

    expect(issuePaths).toContain("selectionToolbar.customActions.0.providerId")
  })

  it("normalizes removed docs-driven provider model ids before validation", () => {
    const providersConfig = [
      ...DEFAULT_CONFIG.providersConfig,
      DEFAULT_PROVIDER_CONFIG.anthropic,
      DEFAULT_PROVIDER_CONFIG.xai,
      DEFAULT_PROVIDER_CONFIG.bedrock,
      DEFAULT_PROVIDER_CONFIG.groq,
      DEFAULT_PROVIDER_CONFIG.mistral,
    ].map((provider) => {
      if (!("model" in provider)) {
        return provider
      }

      switch (provider.id) {
        case "anthropic-default":
          return { ...provider, model: { ...provider.model, model: "claude-3-5-haiku-latest" } }
        case "google-default":
          return { ...provider, model: { ...provider.model, model: "gemini-1.5-flash" } }
        case "xai-default":
          return { ...provider, model: { ...provider.model, model: "grok-2" } }
        case "bedrock-default":
          return { ...provider, model: { ...provider.model, model: "us.anthropic.claude-3-7-sonnet-20250219-v1:0" } }
        case "groq-default":
          return { ...provider, model: { ...provider.model, model: "llama-guard-3-8b" } }
        case "mistral-default":
          return { ...provider, model: { ...provider.model, model: "pixtral-large-latest" } }
        default:
          return provider
      }
    })

    const result = configSchema.safeParse({
      ...DEFAULT_CONFIG,
      providersConfig,
    })

    expect(result.success).toBe(true)
    if (!result.success) {
      return
    }

    const providerModelsById = Object.fromEntries(
      result.data.providersConfig
        .filter(provider => "model" in provider)
        .map(provider => [provider.id, provider.model.model]),
    )

    expect(providerModelsById["anthropic-default"]).toBe("claude-haiku-4-5")
    expect(providerModelsById["google-default"]).toBe("gemini-2.5-flash-lite")
    expect(providerModelsById["xai-default"]).toBe("grok-4.20-non-reasoning")
    expect(providerModelsById["bedrock-default"]).toBe("us.anthropic.claude-sonnet-4-5-20250929-v1:0")
    expect(providerModelsById["groq-default"]).toBe("llama-3.1-8b-instant")
    expect(providerModelsById["mistral-default"]).toBe("pixtral-12b-2409")
  })
})

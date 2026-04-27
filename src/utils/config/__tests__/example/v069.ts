import type { VersionTestData } from "./types"
import { testSeries as v068TestSeries } from "./v068"

const migratedSeries = Object.fromEntries(
  Object.entries(v068TestSeries).map(([seriesId, seriesData]) => [
    seriesId,
    {
      ...seriesData,
      config: {
        ...seriesData.config,
        floatingButton: {
          ...seriesData.config.floatingButton,
          side: "right",
        },
      },
    },
  ]),
) as VersionTestData["testSeries"]

const baseDeprecatedDocsDrivenSeries = migratedSeries["complex-config-from-v020"]

export const testSeries = {
  ...migratedSeries,
  "deprecated-docs-driven-provider-models": {
    description: "Deprecated docs-driven provider model ids remain selector-backed before v070 migration",
    config: {
      ...baseDeprecatedDocsDrivenSeries.config,
      providersConfig: [
        ...baseDeprecatedDocsDrivenSeries.config.providersConfig.map((providerConfig: typeof baseDeprecatedDocsDrivenSeries.config.providersConfig[number]) => providerConfig.id === "google-default"
          ? {
              ...providerConfig,
              model: {
                model: "gemini-1.5-flash",
                isCustomModel: false,
                customModel: "",
              },
            }
          : providerConfig.id === "deepseek-default"
            ? {
                ...providerConfig,
                model: {
                  model: "deepseek-v4-flash",
                  isCustomModel: false,
                  customModel: "",
                },
              }
            : providerConfig),
        {
          id: "anthropic-default",
          enabled: true,
          name: "Anthropic",
          provider: "anthropic",
          apiKey: "anth-key",
          model: {
            model: "claude-3-5-haiku-latest",
            isCustomModel: false,
            customModel: "",
          },
        },
        {
          id: "xai-default",
          enabled: true,
          name: "Grok",
          provider: "xai",
          apiKey: "xai-key",
          model: {
            model: "grok-2",
            isCustomModel: false,
            customModel: "",
          },
        },
        {
          id: "bedrock-default",
          enabled: true,
          name: "Amazon Bedrock",
          provider: "bedrock",
          model: {
            model: "us.anthropic.claude-3-7-sonnet-20250219-v1:0",
            isCustomModel: false,
            customModel: "",
          },
        },
        {
          id: "groq-default",
          enabled: true,
          name: "Groq",
          provider: "groq",
          apiKey: "groq-key",
          model: {
            model: "llama-guard-3-8b",
            isCustomModel: false,
            customModel: "",
          },
        },
      ],
    },
  },
} as VersionTestData["testSeries"]

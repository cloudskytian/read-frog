import { describe, expect, it } from "vitest"
import { migrate } from "../../migration-scripts/v069-to-v070"

describe("v069-to-v070 migration", () => {
  it("converts removed selector-backed provider models into preserved custom models", () => {
    const migrated = migrate({
      providersConfig: [
        {
          provider: "google",
          model: {
            model: "gemini-1.5-flash",
            isCustomModel: false,
            customModel: "",
          },
        },
        {
          provider: "xai",
          model: {
            model: "grok-2",
            isCustomModel: false,
            customModel: "",
          },
        },
      ],
    })

    expect(migrated.providersConfig).toEqual([
      {
        provider: "google",
        model: {
          model: "gemini-2.5-flash-lite",
          isCustomModel: true,
          customModel: "gemini-1.5-flash",
        },
      },
      {
        provider: "xai",
        model: {
          model: "grok-4.20-non-reasoning",
          isCustomModel: true,
          customModel: "grok-2",
        },
      },
    ])
  })

  it("preserves an existing customModel string when one is already set", () => {
    const migrated = migrate({
      providersConfig: [
        {
          provider: "groq",
          model: {
            model: "llama-guard-3-8b",
            isCustomModel: false,
            customModel: "legacy-custom-id",
          },
        },
      ],
    })

    expect(migrated.providersConfig[0].model).toEqual({
      model: "llama-3.1-8b-instant",
      isCustomModel: true,
      customModel: "legacy-custom-id",
    })
  })

  it("leaves unaffected provider configs unchanged", () => {
    const config = {
      providersConfig: [
        {
          provider: "openai",
          model: {
            model: "gpt-5.4-mini",
            isCustomModel: false,
            customModel: "",
          },
        },
      ],
    }

    expect(migrate(config)).toEqual(config)
  })

  it("returns the original config when providersConfig is missing", () => {
    const config = { foo: "bar" }
    expect(migrate(config)).toEqual(config)
  })
})

---
date: 2026-03-01
tags: [type/semantic, tech/anthropic-sdk]
source: direct experience
status: verified
---

# Anthropic TypeScript SDK: JSON Mode Workaround

## Summary
The `@anthropic-ai/sdk` TypeScript types for `output_config.format` only accept `type: "json_schema"` (with a full schema), not `type: "json_mode"`. Using `json_mode` causes a compile error.

## Key points
- `output_config: { format: { type: "json_mode" } }` fails with: `Type '"json_mode"' is not assignable to type '"json_schema"'`
- Workaround: skip `output_config` entirely, add "Respond only with the JSON object, no other text." to the user message
- For structured outputs with schema enforcement, use `client.messages.parse()` with `zodOutputFormat()` from `@anthropic-ai/sdk/helpers/zod`
- The `json_mode` type exists in the API but the SDK types don't expose it as of early 2026

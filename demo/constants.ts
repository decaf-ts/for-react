import type { IMenuItem } from "../src/lib";

export const AppMenu: IMenuItem[] = [
  { label: "menu.dashboard", icon: "ti-layout-dashboard", url: "/" },
  { label: "menu.crud", icon: "ti-device-floppy", url: "/crud" },
  { label: "menu.fieldset", icon: "ti-layers", url: "/fieldset" },
  { label: "menu.steps_form", icon: "ti-steps", url: "/steps-form" },
  { label: "menu.model", icon: "ti-folder", url: "/model" },
  { label: "menu.list_model", icon: "ti-list", url: "/list-model" },
  { label: "menu.model_builder", icon: "ti-scan-cube", url: "/model-builder" },
  { label: "menu.components", icon: "ti-components", url: "/components" },
  { label: "menu.code_editor", icon: "ti-code", url: "/code-editor" },
  { label: "Gantt", icon: "ti-chart-bar", url: "/gantt" },
  { label: "menu.login", icon: "ti-login", url: "/login" },
];

export enum AIVendors {
  GOOGLE = "google",
  OPEN_AI = "openai",
  ANTHROPIC = "anthropic",
  PERPLEXITY = "perplexity",
  MIDJOURNEY = "midjourney",
  RUNWAY = "runway",
  OLLAMA = "ollama",
  MISTRAL = "mistralai",
}

export enum AIFeatures {
  SUMMARIZATION = "summarization",
  CONTEXTUALIZATION = "contextualization",
  KEYWORDS = "keywords",
  RERANKING = "reranking",
  TEXT_TO_SPEECH = "text-to-speech",
  SPEECH_TO_TEXT = "speech-to-text",
  IMAGE_TO_TEXT = "image-to-text",
  TEXT_TO_IMAGE = "text-to-image",
  REASONING = "reasoning",
  CHAT = "chat",
  TRANSLATION = "translation",
  PLANNING = "planning",
  CODING = "coding",
}

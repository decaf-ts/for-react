/**
 * @file
 * @summary Weather tool result card with day/night variants.
 * @description Renders the `ChatToolWeather` agent chat component and its props contract.
 */
import React from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type { AgentChatWeatherState } from "../../types.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

/**
 * @description Props accepted by {@link ChatToolWeather}.
 * @summary Declares every input the ChatToolWeather component understands.
 * @memberOf module:for-react.agent
 * @property {string} [location] - Forecast location.
 * @property {string} [condition] - Weather condition label.
 * @property {number} [high] - Forecast high temperature.
 * @property {number} [low] - Forecast low temperature.
 * @property {string} [unit] - Temperature unit.
 * @property {boolean} [night] - Whether to render the night variant.
 * @property {AgentChatWeatherState} [state] - Tool call or weather render state.
 * @property {string} [error] - Error text rendered by the component.
 */
export interface ChatToolWeatherProps {
  location?: string;
  condition?: string | null;
  high?: number;
  low?: number;
  unit?: string;
  night?: boolean;
  state?: AgentChatWeatherState;
  error?: string | null;
}

function WeatherGlyph({ night }: { night: boolean }) {
  if (night) {
    return (
      <svg
        viewBox="0 0 24 24"
        width="28"
        height="28"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.8 6.8 0 0 0 9.8 9.8Z" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      width="28"
      height="28"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </svg>
  );
}

/**
 * @description Weather tool result card with day/night variants.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatToolWeather({
  location = "",
  condition = null,
  high = 0,
  low = 0,
  unit = "°C",
  night = false,
  state = "success",
  error = null,
}: ChatToolWeatherProps) {
  const t = useAgentTranslate();
  const isLoading = state === "loading";
  const isError = state === "error";
  const conditionKey = `agent.chat.tool.weather.condition.${night ? "night" : "day"}`;
  const conditionFallback = night ? "Clear night" : "Sunny";
  const title = t("agent.chat.tool.weather.title", "Weather");

  return (
    <section
      className="dcf-chat-tool-weather"
      data-state={state}
      data-variant={night ? "night" : "day"}
      aria-busy={isLoading ? "true" : undefined}
      aria-label={`${title}${location ? ` — ${location}` : ""}`}
    >
      <header className="dcf-chat-tool-weather__header">
        <span className="dcf-chat-tool-weather__icon" aria-hidden="true">
          <WeatherGlyph night={night} />
        </span>
        <div className="dcf-chat-tool-weather__heading">
          <span className="dcf-chat-tool-weather__location">{location}</span>
          {!isLoading && !isError ? (
            <span className="dcf-chat-tool-weather__condition">
              {condition
                ? condition
                : t(conditionKey, conditionFallback)}
            </span>
          ) : null}
        </div>
      </header>

      {isLoading ? (
        <div className="dcf-chat-tool-weather__loading" role="status">
          <ChatIcon name="loader" size={16} />
          <span>
            {t("agent.chat.tool.weather.loading", "Fetching the forecast…")}
          </span>
        </div>
      ) : isError ? (
        <p className="dcf-chat-tool-weather__error" role="alert">
          {error ||
            t(
              "agent.chat.tool.weather.error",
              "The forecast is unavailable right now."
            )}
        </p>
      ) : (
        <dl className="dcf-chat-tool-weather__temperatures">
          <div className="dcf-chat-tool-weather__temperature">
            <dt>{t("agent.chat.tool.weather.high", "High")}</dt>
            <dd>
              {high}
              {unit}
            </dd>
          </div>
          <div className="dcf-chat-tool-weather__temperature dcf-chat-tool-weather__temperature--low">
            <dt>{t("agent.chat.tool.weather.low", "Low")}</dt>
            <dd>
              {low}
              {unit}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}

/**
 * @description Named alias of {@link ChatToolWeather} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatToolWeatherComponent = ChatToolWeather;

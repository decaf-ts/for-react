/**
 * @file
 * @summary Orders tool result card.
 * @description Renders the `ChatToolOrders` agent chat component and its props contract.
 */
import React from "react";
import { useAgentTranslate } from "../../react/AgentChatProvider.js";
import type { AgentChatOrder } from "../../types.js";
import { safeMediaUrl } from "../../utils/agentMediaUrl.js";
import { ChatIcon } from "../chat-icon/ChatIcon.js";

/**
 * @description Props accepted by {@link ChatToolOrders}.
 * @summary Declares every input the ChatToolOrders component understands.
 * @memberOf module:for-react.agent
 * @property {Array} [orders] - Order results rendered by the card.
 * @property {string} [title] - Title text.
 * @property {function} [onOrderSelect] - Called when an order is selected.
 */
export interface ChatToolOrdersProps {
  orders?: AgentChatOrder[];
  title?: string | null;
  onOrderSelect?: (order: AgentChatOrder) => void;
}

/**
 * @description Orders tool result card.
 * @summary React component for the agent chat surface.
 * @memberOf module:for-react.agent
 */
export function ChatToolOrders({
  orders = [],
  title = null,
  onOrderSelect,
}: ChatToolOrdersProps) {
  const t = useAgentTranslate();
  const heading =
    title || t("agent.chat.tool.orders.title", "Orders");

  return (
    <section className="dcf-chat-tool-orders" aria-label={heading}>
      <header className="dcf-chat-tool-orders__header">
        <ChatIcon name="invoice" size={16} />
        <h3 className="dcf-chat-tool-orders__title">{heading}</h3>
        <span className="dcf-chat-tool-orders__count">{orders.length}</span>
      </header>

      {orders.length ? (
        <ul className="dcf-chat-tool-orders__list">
          {orders.map((order) => {
            const imageUrl = safeMediaUrl(order.imageUrl);
            return (
              <li className="dcf-chat-tool-orders__item" key={order.id}>
                <button
                  type="button"
                  className="dcf-chat-tool-orders__row"
                  onClick={() => onOrderSelect?.(order)}
                >
                  <span className="dcf-chat-tool-orders__thumb" aria-hidden="true">
                    {imageUrl ? (
                      <img
                        className="dcf-chat-tool-orders__image"
                        src={imageUrl}
                        alt={order.name}
                        loading="lazy"
                      />
                    ) : (
                      <ChatIcon name={order.icon || "box"} size={18} />
                    )}
                  </span>
                  <span className="dcf-chat-tool-orders__details">
                    <span className="dcf-chat-tool-orders__name">
                      {order.name}
                    </span>
                    {order.date ? (
                      <time
                        className="dcf-chat-tool-orders__date"
                        dateTime={order.date}
                      >
                        {order.date}
                      </time>
                    ) : null}
                  </span>
                  {order.status ? (
                    <span className="dcf-chat-tool-orders__status">
                      {order.status}
                    </span>
                  ) : null}
                  <span className="dcf-chat-tool-orders__id">{order.id}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="dcf-chat-tool-orders__empty">
          {t("agent.chat.tool.orders.empty", "No orders found.")}
        </p>
      )}
    </section>
  );
}

/**
 * @description Named alias of {@link ChatToolOrders} for renderer and registry consumers.
 * @summary Same component exported under its `Component` suffix alias.
 * @memberOf module:for-react.agent
 */
export const ChatToolOrdersComponent = ChatToolOrders;

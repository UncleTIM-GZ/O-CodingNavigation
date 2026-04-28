import { ulid } from "ulid";

// PR #4 — correlationId is a ULID that ties together every audit event
// emitted by a single advance-flow invocation. Same character set + length as
// eventId so downstream tooling can sort/filter without special handling.
export const newCorrelationId = (): string => ulid();

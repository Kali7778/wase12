/**
 * A request to open the bill screen already pointed at something — for now,
 * "bill this customer order", sent from the Customer Orders screen.
 *
 * Navigation here is a single `currentView` in AppContext with no route
 * parameters, and that context is too large to grow further (CLAUDE.md), so
 * the one piece of information travels through this module instead. It is
 * read once, by the bill screen, and cleared as it is read.
 */
let pendingSlipId: string | null = null;

export const requestBillForSlip = (deliveryNoteId: string): void => {
  pendingSlipId = deliveryNoteId;
};

export const takeBillRequest = (): string | null => {
  const id = pendingSlipId;
  pendingSlipId = null;
  return id;
};

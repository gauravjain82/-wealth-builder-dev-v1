/**
 * Recognition orders as the SMD sees them on their statement: what was sent, to whom,
 * how many, at what price. There is no separate invoice for an order — it is netted into
 * the monthly plug-in invoice — so this itemisation is how the SMD knows what each
 * "Recognition and mailing costs" charge is for. Rendered under that invoice line, under
 * the `costs` ledger entry, and in the "Upcoming charges" card (orders not yet netted).
 */

import type { CostOrder } from '../../types';
import { formatDate, formatMoney } from '../../utils/plugin-fees-format';

/** The invoice line label the backend gives the netted costs (`billing.smd_charge`). */
export const COSTS_LINE_LABEL = 'Recognition and mailing costs';

function CostOrderCard({ order }: { order: CostOrder }) {
  return (
    <div className="wb-pf-order">
      <div className="wb-pf-order-head">
        <span>
          <code>{order.number}</code>
          <span className="wb-pf-muted">
            {' '}
            · sent {formatDate(order.date_sent)}
            {order.recipient_name ? ` · for ${order.recipient_name}` : ''}
          </span>
        </span>
        <strong className="wb-pf-num">{formatMoney(order.total_cents)}</strong>
      </div>
      <table className="wb-pf-order-lines">
        <thead className="sr-only">
          <tr>
            <th scope="col">Item</th>
            <th scope="col">Quantity and unit price</th>
            <th scope="col">Amount</th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((line, index) => (
            <tr key={index}>
              <td>
                {line.description}
                {line.sku ? <span className="wb-pf-muted"> · {line.sku}</span> : null}
              </td>
              <td className="wb-pf-num wb-pf-muted">
                {line.quantity} × {formatMoney(line.unit_price_cents)}
              </td>
              <td className="wb-pf-num">{formatMoney(line.amount_cents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Each order with its rows. Renders nothing for an empty list. */
export function CostOrdersList({ orders }: { orders: CostOrder[] | undefined }) {
  if (!orders?.length) return null;
  return (
    <div className="wb-pf-orders">
      {orders.map((order) => (
        <CostOrderCard key={order.id} order={order} />
      ))}
    </div>
  );
}

/**
 * Orders logged but not yet netted, grouped by the 1st they will be netted on, so the
 * SMD sees a charge before it lands. Renders nothing when there are none.
 */
export function UpcomingCosts({ orders, own }: { orders: CostOrder[] | undefined; own: boolean }) {
  if (!orders?.length) return null;
  const groups = new Map<string, CostOrder[]>();
  orders.forEach((order) => {
    const key = order.nets_on ?? '';
    groups.set(key, [...(groups.get(key) ?? []), order]);
  });
  const total = orders.reduce((sum, order) => sum + order.total_cents, 0);
  return (
    <section className="wb-pf-card" aria-labelledby="wb-pf-upcoming-heading">
      <div className="wb-pf-card-header">
        <h2 id="wb-pf-upcoming-heading" className="wb-pf-subheading">
          Upcoming recognition charges
        </h2>
        <strong>{formatMoney(total)}</strong>
      </div>
      <p className="wb-pf-muted" style={{ margin: 0 }}>
        Recognition sent on behalf of {own ? 'your' : 'this SMD’s'} team. Each order is charged on
        the date shown, through the monthly plug-in invoice — there is no separate bill.
      </p>
      {[...groups.entries()].map(([netsOn, group]) => (
        <div key={netsOn} className="wb-pf-stack" style={{ gap: 8 }}>
          <h3 className="wb-pf-field-label" style={{ margin: 0 }}>
            {netsOn ? `Charged on ${formatDate(netsOn)}` : 'Charged on the next cycle'}
          </h3>
          <CostOrdersList orders={group} />
        </div>
      ))}
    </section>
  );
}

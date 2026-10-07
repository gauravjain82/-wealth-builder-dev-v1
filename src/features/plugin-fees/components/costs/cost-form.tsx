/**
 * Log a recognition order like a point-of-sale cart (`POST costs/batch/`): pick products
 * from the catalogue with a quantity (or type a row by hand), choose one or more SMDs,
 * and save. Every row is charged **in full to each** selected SMD; the backend creates
 * one order per SMD. There is no separate invoice: each order is netted into the SMD's
 * next monthly cycle and itemised on their statement.
 *
 * Catalogue rows take the catalogue price; changing it asks for a reason. Dollar inputs
 * are parsed as text into integer cents (never through floating point); totals are for
 * display only — the backend prices the rows itself. A `validation_error` maps `fields`
 * onto the inputs, including per-row errors under `lines` (keyed by row index).
 */

import { useRef, useState, type FormEvent } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";

import {
  Button,
  Input,
  Select,
  Textarea,
  UserAutocompleteDropdown,
} from "@/shared/components";
import { useToastStore } from "@/store";

import { useCreateCostBatch, useProducts } from "../../hooks/use-plugin-fees";
import { PluginFeesError } from "../../services/plugin-fees-service";
import type {
  CostBatchInput,
  CostLineInput,
  CostLineKind,
  RecognitionProduct,
} from "../../types";
import {
  centsToDollarText,
  describeError,
  fieldErrors,
  formatMoney,
  parseDollarsToCents,
  todayValue,
} from "../../utils/plugin-fees-format";
import { SmdMultiSelect, type PickedSmd } from "./smd-multi-select";

interface Person {
  id: number;
  label: string;
}

/** One cart row. `productId` null = typed by hand. Money and quantity are kept as text. */
interface Row {
  key: number;
  productId: number | null;
  sku: string;
  kind: CostLineKind;
  description: string;
  quantity: string;
  price: string;
  /** The catalogue price when the row was added; `null` for a typed row. */
  catalogPriceCents: number | null;
  overrideReason: string;
}

const KIND_LABEL: Record<CostLineKind, string> = {
  recognition: "Item",
  mailing: "Mailing",
};

const MAX_QUANTITY = 1000;

/** Per-row messages from a `validation_error` on `lines` (keyed by row index). */
function rowErrors(error: unknown): Record<number, string> {
  const lines =
    error instanceof PluginFeesError
      ? (error.fields?.lines as unknown)
      : undefined;
  if (!lines || typeof lines !== "object") return {};
  const out: Record<number, string> = {};
  Object.entries(lines as Record<string, unknown>).forEach(([index, entry]) => {
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      const messages = Object.values(entry as Record<string, string[]>).flat();
      if (messages.length) out[Number(index)] = messages.join(" ");
    }
  });
  return out;
}

function parseQuantity(value: string): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const n = Number(value.trim());
  return n >= 1 && n <= MAX_QUANTITY ? n : null;
}

/** The row total in cents, or `null` while the quantity or price is not valid. */
function rowTotal(row: Row): number | null {
  const quantity = parseQuantity(row.quantity);
  const cents = parseDollarsToCents(row.price);
  if (quantity === null || typeof cents !== "number") return null;
  return quantity * cents;
}

function isOverride(row: Row): boolean {
  if (row.catalogPriceCents === null) return false;
  const cents = parseDollarsToCents(row.price);
  return typeof cents === "number" && cents !== row.catalogPriceCents;
}

export function CostForm() {
  const { addToast } = useToastStore();
  const create = useCreateCostBatch();
  const products = useProducts();
  const nextKey = useRef(1);

  const [smds, setSmds] = useState<PickedSmd[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [picked, setPicked] = useState("");
  const [recipient, setRecipient] = useState<Person | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [dateSent, setDateSent] = useState(todayValue());
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lineErrors, setLineErrors] = useState<Record<number, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const busy = create.isPending;

  const catalogue = products.data ?? [];
  const totals = rows.map(rowTotal);
  const perSmd = totals.every((cents) => cents !== null)
    ? totals.reduce<number>((sum, cents) => sum + (cents ?? 0), 0)
    : null;
  const batchTotal = perSmd === null ? null : perSmd * smds.length;

  const updateRow = (key: number, patch: Partial<Row>) =>
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );

  /** Add a catalogue product; adding one already in the cart raises its quantity. */
  const addProduct = (product: RecognitionProduct) => {
    setRows((current) => {
      const existing = current.find(
        (row) => row.productId === product.id && !isOverride(row),
      );
      if (existing) {
        const quantity = Math.min(
          (parseQuantity(existing.quantity) ?? 0) + 1,
          MAX_QUANTITY,
        );
        return current.map((row) =>
          row.key === existing.key
            ? { ...row, quantity: String(quantity) }
            : row,
        );
      }
      return [
        ...current,
        {
          key: nextKey.current++,
          productId: product.id,
          sku: product.sku,
          kind: product.kind,
          description: product.name,
          quantity: "1",
          price: centsToDollarText(product.unit_price_cents),
          catalogPriceCents: product.unit_price_cents,
          overrideReason: "",
        },
      ];
    });
  };

  const addCustomRow = (kind: CostLineKind) =>
    setRows((current) => [
      ...current,
      {
        key: nextKey.current++,
        productId: null,
        sku: "",
        kind,
        description: kind === "mailing" ? "Mailing" : "",
        quantity: "1",
        price: "",
        catalogPriceCents: null,
        overrideReason: "",
      },
    ]);

  const removeRow = (key: number) => {
    setRows((current) => current.filter((row) => row.key !== key));
    setLineErrors({}); // indexed by position, so stale once a row is gone
  };

  const stepQuantity = (row: Row, delta: number) => {
    const quantity = Math.min(
      Math.max((parseQuantity(row.quantity) ?? 1) + delta, 1),
      MAX_QUANTITY,
    );
    updateRow(row.key, { quantity: String(quantity) });
  };

  const validate = (): {
    form: Record<string, string>;
    rows: Record<number, string>;
  } => {
    const form: Record<string, string> = {};
    const byRow: Record<number, string> = {};
    if (!smds.length) form.smd_ids = "Choose at least one SMD to charge.";
    if (!rows.length) form.lines = "Add at least one product or item.";
    rows.forEach((row, index) => {
      const cents = parseDollarsToCents(row.price);
      if (row.productId === null && row.kind === "recognition" && !row.description.trim())
        byRow[index] = "Enter the item.";
      else if (parseQuantity(row.quantity) === null)
        byRow[index] = `Quantity must be 1–${MAX_QUANTITY}.`;
      else if (cents === null) byRow[index] = "Enter the price.";
      else if (cents === "invalid")
        byRow[index] = "Enter dollars, at most two decimals, not negative.";
      else if (isOverride(row) && !row.overrideReason.trim())
        byRow[index] = "Say why the price differs from the catalogue.";
    });
    if (rows.length && !Object.keys(byRow).length && !perSmd)
      form.lines = "The total must be more than $0.00.";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateSent))
      form.date_sent = "Choose the date it was sent.";
    return { form, rows: byRow };
  };

  const reset = () => {
    setSmds([]);
    setRows([]);
    setRecipient(null);
    setRecipientName("");
    setNote("");
    setErrors({});
    setLineErrors({});
  };

  const toLine = (row: Row): CostLineInput => {
    const quantity = parseQuantity(row.quantity) as number;
    const cents = parseDollarsToCents(row.price) as number;
    if (row.productId !== null) {
      return isOverride(row)
        ? {
            product_id: row.productId,
            quantity,
            unit_price_cents: cents,
            price_override_reason: row.overrideReason.trim(),
          }
        : { product_id: row.productId, quantity };
    }
    return {
      kind: row.kind,
      description: row.description.trim(),
      quantity,
      unit_price_cents: cents,
    };
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    const found = validate();
    setErrors(found.form);
    setLineErrors(found.rows);
    if (Object.keys(found.form).length || Object.keys(found.rows).length)
      return;

    const input: CostBatchInput = {
      smd_ids: smds.map((smd) => smd.id),
      lines: rows.map(toLine),
      date_sent: dateSent,
    };
    if (recipient) input.recipient_id = recipient.id;
    if (recipientName.trim()) input.recipient_name = recipientName.trim();
    if (note.trim()) input.note = note.trim();

    try {
      const result = await create.mutateAsync(input);
      addToast({
        type: "success",
        message: `Logged ${result.count} order${result.count === 1 ? "" : "s"}, ${formatMoney(result.total_cents)} in total.`,
      });
      reset();
    } catch (error) {
      const byField = fieldErrors(error);
      delete byField.lines;
      const linesMessage = (error instanceof PluginFeesError &&
        error.fields?.lines) as unknown;
      if (
        Array.isArray(linesMessage) &&
        linesMessage.every((m) => typeof m === "string")
      ) {
        byField.lines = linesMessage.join(" ");
      }
      setErrors(byField);
      setLineErrors(rowErrors(error));
      const message = describeError(error, "Failed to log the order.");
      setFormError(message);
      addToast({ type: "error", message });
    }
  };

  const err = (key: string) =>
    errors[key] ? (
      <span className="wb-pf-field-error" role="alert">
        {errors[key]}
      </span>
    ) : null;

  const byKind = (kind: CostLineKind) =>
    catalogue.filter((product) => product.kind === kind);

  return (
    <form className="wb-pf-stack" onSubmit={onSubmit} noValidate>
      <div className="wb-pf-field">
        <span className="wb-pf-field-label" id="wb-pf-cost-smd-label">
          SMDs charged *
        </span>
        <div aria-labelledby="wb-pf-cost-smd-label">
          <SmdMultiSelect selected={smds} onChange={setSmds} disabled={busy} />
        </div>
        {err("smd_ids")}
      </div>

      <div className="wb-pf-field">
        <span className="wb-pf-field-label" id="wb-pf-cost-lines-label">
          Cart *
        </span>
        <div className="wb-pf-row wb-pf-cart-picker">
          <div style={{ flex: "1 1 16rem", minWidth: 0 }}>
            <Select
              aria-label="Product to add"
              value={picked}
              disabled={busy || products.isLoading}
              onChange={(event) => {
                const product = catalogue.find(
                  (p) => String(p.id) === event.target.value,
                );
                if (product) addProduct(product);
                setPicked("");
              }}
            >
              <option value="">
                {products.isLoading
                  ? "Loading catalogue…"
                  : catalogue.length
                    ? "Add a product from the catalogue…"
                    : "The catalogue is empty — add products below"}
              </option>
              {(["recognition", "mailing"] as const).map((kind) =>
                byKind(kind).length ? (
                  <optgroup
                    key={kind}
                    label={kind === "mailing" ? "Mailing" : "Recognition items"}
                  >
                    {byKind(kind).map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.sku} · {product.name} ·{" "}
                        {formatMoney(product.unit_price_cents)}
                      </option>
                    ))}
                  </optgroup>
                ) : null,
              )}
            </Select>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => addCustomRow("recognition")}
          >
            <Plus size={14} /> Custom item
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => addCustomRow("mailing")}
          >
            <Plus size={14} /> Custom mailing
          </Button>
        </div>

        {rows.length ? (
          <div className="wb-pf-table-wrap">
            <table
              className="wb-pf-table wb-pf-table--dense wb-pf-cost-lines"
              aria-labelledby="wb-pf-cost-lines-label"
            >
              <thead>
                <tr>
                  <th scope="col">Item</th>
                  <th scope="col" style={{ width: "9rem" }}>
                    Qty
                  </th>
                  <th scope="col" className="wb-pf-num" style={{ width: "9rem" }}>
                    Unit price ($)
                  </th>
                  <th scope="col" className="wb-pf-num" style={{ width: "8rem" }}>
                    Amount
                  </th>
                  <th scope="col" style={{ width: "3rem" }}>
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.key}>
                    <td>
                      {row.productId !== null ? (
                        <div>
                          <strong>{row.description}</strong>
                          <span className="wb-pf-muted" style={{ display: "block" }}>
                            {row.sku} · {KIND_LABEL[row.kind]}
                          </span>
                        </div>
                      ) : (
                        <div className="wb-pf-row" style={{ gap: 6 }}>
                          <Select
                            aria-label={`Row ${index + 1} type`}
                            value={row.kind}
                            disabled={busy}
                            style={{ width: "7.5rem" }}
                            onChange={(event) => {
                              const kind = event.target.value as CostLineKind;
                              const description =
                                kind === "mailing" && !row.description.trim()
                                  ? "Mailing"
                                  : kind === "recognition" &&
                                      row.description === "Mailing"
                                    ? ""
                                    : row.description;
                              updateRow(row.key, { kind, description });
                            }}
                          >
                            <option value="recognition">{KIND_LABEL.recognition}</option>
                            <option value="mailing">{KIND_LABEL.mailing}</option>
                          </Select>
                          <div style={{ flex: "1 1 10rem", minWidth: 0 }}>
                            <Input
                              aria-label={`Row ${index + 1} description`}
                              value={row.description}
                              placeholder={
                                row.kind === "mailing" ? "Mailing" : "e.g. Custom pin"
                              }
                              maxLength={150}
                              disabled={busy}
                              onChange={(event) =>
                                updateRow(row.key, { description: event.target.value })
                              }
                            />
                          </div>
                        </div>
                      )}
                      {isOverride(row) ? (
                        <div className="wb-pf-override">
                          <span className="wb-pf-muted">
                            Catalogue price {formatMoney(row.catalogPriceCents)} — reason
                            for the change *
                          </span>
                          <Input
                            aria-label={`Row ${index + 1} reason for the price change`}
                            value={row.overrideReason}
                            maxLength={255}
                            disabled={busy}
                            onChange={(event) =>
                              updateRow(row.key, { overrideReason: event.target.value })
                            }
                          />
                        </div>
                      ) : null}
                      {lineErrors[index] ? (
                        <span className="wb-pf-field-error" role="alert">
                          {lineErrors[index]}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <div className="wb-pf-qty">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={`Decrease row ${index + 1} quantity`}
                          disabled={busy || (parseQuantity(row.quantity) ?? 1) <= 1}
                          onClick={() => stepQuantity(row, -1)}
                        >
                          <Minus size={14} />
                        </Button>
                        <Input
                          aria-label={`Row ${index + 1} quantity`}
                          inputMode="numeric"
                          value={row.quantity}
                          disabled={busy}
                          className="text-center"
                          onChange={(event) =>
                            updateRow(row.key, { quantity: event.target.value })
                          }
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          aria-label={`Increase row ${index + 1} quantity`}
                          disabled={busy}
                          onClick={() => stepQuantity(row, 1)}
                        >
                          <Plus size={14} />
                        </Button>
                      </div>
                    </td>
                    <td className="wb-pf-num">
                      <Input
                        aria-label={`Row ${index + 1} unit price in dollars`}
                        inputMode="decimal"
                        value={row.price}
                        placeholder="0.00"
                        disabled={busy}
                        className="text-right"
                        onChange={(event) =>
                          updateRow(row.key, { price: event.target.value })
                        }
                      />
                    </td>
                    <td className="wb-pf-num">{formatMoney(totals[index])}</td>
                    <td>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label={`Remove row ${index + 1}`}
                        disabled={busy}
                        onClick={() => removeRow(row.key)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="wb-pf-num">
                    <span className="wb-pf-muted">Per SMD</span>
                  </td>
                  <td className="wb-pf-num" aria-live="polite">
                    <strong>{formatMoney(perSmd)}</strong>
                  </td>
                  <td />
                </tr>
                {smds.length > 1 ? (
                  <tr>
                    <td colSpan={3} className="wb-pf-num">
                      <span className="wb-pf-muted">
                        × {smds.length} SMDs (each charged the full cart)
                      </span>
                    </td>
                    <td className="wb-pf-num" aria-live="polite">
                      <strong>{formatMoney(batchTotal)}</strong>
                    </td>
                    <td />
                  </tr>
                ) : null}
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="wb-pf-muted" style={{ margin: 0 }}>
            The cart is empty. Add products from the catalogue, or a custom row.
          </p>
        )}
        {err("lines")}
      </div>

      <div className="wb-pf-form-grid">
        <div className="wb-pf-field">
          <span className="wb-pf-field-label" id="wb-pf-cost-recipient-label">
            Recipient user (optional)
          </span>
          <div className="wb-pf-row" aria-labelledby="wb-pf-cost-recipient-label">
            <div style={{ flex: "1 1 12rem", minWidth: 0 }}>
              <UserAutocompleteDropdown
                selectedId={recipient?.id ?? null}
                selectedLabel={recipient?.label}
                placeholder="Link a user…"
                buttonText={recipient ? "CHANGE" : "SELECT"}
                fetchFromApi
                includeUncoded
                disabled={busy}
                onSelect={(option) => {
                  setRecipient({ id: option.id, label: option.label });
                  if (!recipientName.trim()) setRecipientName(option.label);
                }}
              />
            </div>
            {recipient ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setRecipient(null)}
              >
                Clear
              </Button>
            ) : null}
          </div>
          {err("recipient_id")}
        </div>

        <label className="wb-pf-field">
          <span className="wb-pf-field-label">Recipient name (optional)</span>
          <Input
            value={recipientName}
            onChange={(event) => setRecipientName(event.target.value)}
            placeholder="Leave blank to name each SMD"
            maxLength={150}
            disabled={busy}
          />
          {err("recipient_name")}
        </label>

        <label className="wb-pf-field">
          <span className="wb-pf-field-label">Date sent *</span>
          <Input
            type="date"
            value={dateSent}
            onChange={(event) => setDateSent(event.target.value)}
            aria-invalid={Boolean(errors.date_sent)}
            disabled={busy}
          />
          {err("date_sent")}
        </label>

        <label className="wb-pf-field wb-pf-span-2">
          <span className="wb-pf-field-label">Internal note (optional, not shown to the SMD)</span>
          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={2}
            disabled={busy}
          />
          {err("note")}
        </label>
      </div>

      <p className="wb-pf-muted" style={{ margin: 0 }}>
        Each selected SMD gets their own order with the full cart. It is netted against
        them on the 1st of the month after it was sent and listed, item by item, on their
        statement.
      </p>
      {formError ? (
        <div className="wb-pf-form-error" role="alert">
          {formError}
        </div>
      ) : null}
      <div className="wb-pf-row">
        <Button type="submit" disabled={busy}>
          {busy
            ? "Saving…"
            : smds.length > 1
              ? `Log ${smds.length} orders · ${formatMoney(batchTotal)}`
              : `Log order${perSmd ? ` · ${formatMoney(perSmd)}` : ""}`}
        </Button>
      </div>
    </form>
  );
}

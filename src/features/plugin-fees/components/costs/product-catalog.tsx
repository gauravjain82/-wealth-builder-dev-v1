/**
 * The recognition product catalogue (`costs/products/`, `plugin_fees:manage`): what can
 * be put on a recognition order, with its SKU and current price. Products are added
 * here, edited (a reason is required, and is kept in the money trail) and retired —
 * never deleted. A price change affects only new orders; orders already logged keep the
 * price they were logged at.
 */

import { useEffect, useState, type FormEvent } from "react";

import {
  Button,
  Checkbox,
  ConfirmationDialog,
  ErrorState,
  Input,
  NonIdealState,
  Select,
  Textarea,
} from "@/shared/components";
import { useToastStore } from "@/store";

import {
  useCreateProduct,
  useProducts,
  useUpdateProduct,
} from "../../hooks/use-plugin-fees";
import type { CostLineKind, RecognitionProduct } from "../../types";
import {
  centsToDollarText,
  describeError,
  fieldErrors,
  formatDate,
  formatMoney,
  parseDollarsToCents,
} from "../../utils/plugin-fees-format";

interface Draft {
  sku: string;
  name: string;
  kind: CostLineKind;
  price: string;
  description: string;
}

const EMPTY: Draft = { sku: "", name: "", kind: "recognition", price: "", description: "" };

const KIND_LABEL: Record<CostLineKind, string> = {
  recognition: "Recognition item",
  mailing: "Mailing",
};

/** Client-side checks; the server repeats them. Returns field → message. */
function checkDraft(draft: Draft): Record<string, string> {
  const out: Record<string, string> = {};
  if (!draft.sku.trim()) out.sku = "Enter a SKU.";
  if (!draft.name.trim()) out.name = "Enter a name.";
  const cents = parseDollarsToCents(draft.price);
  if (cents === null) out.unit_price_cents = "Enter the price.";
  else if (cents === "invalid" || cents <= 0)
    out.unit_price_cents = "Dollars above zero, at most two decimals.";
  return out;
}

function DraftFields({
  draft,
  onChange,
  errors,
  disabled,
}: {
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
  errors: Record<string, string>;
  disabled: boolean;
}) {
  const err = (key: string) =>
    errors[key] ? (
      <span className="wb-pf-field-error" role="alert">
        {errors[key]}
      </span>
    ) : null;
  return (
    <div className="wb-pf-form-grid">
      <label className="wb-pf-field">
        <span className="wb-pf-field-label">SKU *</span>
        <Input
          value={draft.sku}
          maxLength={40}
          placeholder="e.g. PLQ-GOLD"
          disabled={disabled}
          onChange={(event) => onChange({ sku: event.target.value.toUpperCase() })}
        />
        {err("sku")}
      </label>
      <label className="wb-pf-field">
        <span className="wb-pf-field-label">Name *</span>
        <Input
          value={draft.name}
          maxLength={150}
          placeholder="e.g. Gold plaque"
          disabled={disabled}
          onChange={(event) => onChange({ name: event.target.value })}
        />
        {err("name")}
      </label>
      <label className="wb-pf-field">
        <span className="wb-pf-field-label">Type</span>
        <Select
          value={draft.kind}
          disabled={disabled}
          onChange={(event) => onChange({ kind: event.target.value as CostLineKind })}
        >
          <option value="recognition">{KIND_LABEL.recognition}</option>
          <option value="mailing">{KIND_LABEL.mailing}</option>
        </Select>
        {err("kind")}
      </label>
      <label className="wb-pf-field">
        <span className="wb-pf-field-label">Unit price ($) *</span>
        <Input
          inputMode="decimal"
          value={draft.price}
          placeholder="0.00"
          disabled={disabled}
          className="text-right"
          onChange={(event) => onChange({ price: event.target.value })}
        />
        {err("unit_price_cents")}
      </label>
      <label className="wb-pf-field wb-pf-span-2">
        <span className="wb-pf-field-label">Description (optional)</span>
        <Input
          value={draft.description}
          maxLength={255}
          disabled={disabled}
          onChange={(event) => onChange({ description: event.target.value })}
        />
        {err("description")}
      </label>
    </div>
  );
}

/** Edit or retire/restore one product. A reason is always required. */
function EditProductDialog({
  product,
  onClose,
}: {
  product: RecognitionProduct | null;
  onClose: () => void;
}) {
  const { addToast } = useToastStore();
  const update = useUpdateProduct();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [active, setActive] = useState(true);
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!product) return;
    setDraft({
      sku: product.sku,
      name: product.name,
      kind: product.kind,
      price: centsToDollarText(product.unit_price_cents),
      description: product.description,
    });
    setActive(product.active);
    setReason("");
    setErrors({});
  }, [product]);

  const onConfirm = async () => {
    if (!product) return;
    const found = checkDraft(draft);
    if (!reason.trim()) found.reason = "Say why you are changing it.";
    setErrors(found);
    if (Object.keys(found).length) return;
    try {
      await update.mutateAsync({
        id: product.id,
        sku: draft.sku.trim(),
        name: draft.name.trim(),
        kind: draft.kind,
        unit_price_cents: parseDollarsToCents(draft.price) as number,
        description: draft.description.trim(),
        active,
        reason: reason.trim(),
      });
      addToast({ type: "success", message: `${draft.name.trim()} saved.` });
      onClose();
    } catch (error) {
      setErrors(fieldErrors(error));
      addToast({ type: "error", message: describeError(error, "Failed to save the product.") });
    }
  };

  const priceChanged =
    product !== null && parseDollarsToCents(draft.price) !== product.unit_price_cents;

  return (
    <ConfirmationDialog
      open={product !== null}
      title={product ? `Edit ${product.sku}` : "Edit product"}
      message="Changes apply to new orders only. Retire a product instead of deleting it."
      confirmText="Save"
      confirmVariant="default"
      loading={update.isPending}
      onConfirm={onConfirm}
      onClose={onClose}
    >
      <div className="wb-pf-stack">
        <DraftFields
          draft={draft}
          onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
          errors={errors}
          disabled={update.isPending}
        />
        <label className="wb-pf-row" style={{ gap: 8 }}>
          <Checkbox
            checked={active}
            disabled={update.isPending}
            onChange={(event) => setActive(event.target.checked)}
          />
          <span className="text-sm">Active (can be added to new orders)</span>
        </label>
        {priceChanged ? (
          <p className="wb-pf-muted" style={{ margin: 0 }}>
            Orders already logged keep {formatMoney(product?.unit_price_cents)}.
          </p>
        ) : null}
        <label className="wb-pf-field">
          <span className="wb-pf-field-label">Reason (required)</span>
          <Textarea
            value={reason}
            rows={2}
            disabled={update.isPending}
            onChange={(event) => setReason(event.target.value)}
          />
          {errors.reason ? (
            <span className="wb-pf-field-error" role="alert">
              {errors.reason}
            </span>
          ) : null}
        </label>
      </div>
    </ConfirmationDialog>
  );
}

export function ProductCatalog() {
  const { addToast } = useToastStore();
  const [showRetired, setShowRetired] = useState(false);
  const products = useProducts(showRetired);
  const create = useCreateProduct();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<RecognitionProduct | null>(null);

  const onAdd = async (event: FormEvent) => {
    event.preventDefault();
    const found = checkDraft(draft);
    setErrors(found);
    if (Object.keys(found).length) return;
    try {
      const product = await create.mutateAsync({
        sku: draft.sku.trim(),
        name: draft.name.trim(),
        kind: draft.kind,
        unit_price_cents: parseDollarsToCents(draft.price) as number,
        description: draft.description.trim(),
      });
      addToast({ type: "success", message: `${product.sku} added to the catalogue.` });
      setDraft(EMPTY);
    } catch (error) {
      setErrors(fieldErrors(error));
      addToast({ type: "error", message: describeError(error, "Failed to add the product.") });
    }
  };

  return (
    <div className="wb-pf-stack">
      <form className="wb-pf-stack" onSubmit={onAdd} noValidate>
        <DraftFields
          draft={draft}
          onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
          errors={errors}
          disabled={create.isPending}
        />
        <div className="wb-pf-row">
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? "Adding…" : "Add product"}
          </Button>
        </div>
      </form>

      <div className="wb-pf-toolbar">
        <label className="wb-pf-row" style={{ gap: 8 }}>
          <Checkbox
            checked={showRetired}
            onChange={(event) => setShowRetired(event.target.checked)}
          />
          <span className="text-sm">Show retired products</span>
        </label>
      </div>

      {products.isLoading ? (
        <p className="wb-pf-muted">Loading…</p>
      ) : products.isError ? (
        <ErrorState
          description={describeError(products.error, "Unable to load the catalogue.")}
          onRetry={() => void products.refetch()}
        />
      ) : !products.data?.length ? (
        <NonIdealState
          title="No products"
          description="Add the recognition items and mailing options you send, with their price."
        />
      ) : (
        <div className="wb-pf-table-wrap">
          <table className="wb-pf-table wb-pf-table--dense">
            <thead>
              <tr>
                <th scope="col">SKU</th>
                <th scope="col">Name</th>
                <th scope="col">Type</th>
                <th scope="col" className="wb-pf-num">
                  Unit price
                </th>
                <th scope="col">Status</th>
                <th scope="col">Updated</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {products.data.map((product) => (
                <tr key={product.id}>
                  <td>
                    <code>{product.sku}</code>
                  </td>
                  <td>
                    {product.name}
                    {product.description ? (
                      <span className="wb-pf-note">{product.description}</span>
                    ) : null}
                  </td>
                  <td>{KIND_LABEL[product.kind]}</td>
                  <td className="wb-pf-num">{formatMoney(product.unit_price_cents)}</td>
                  <td>
                    <span
                      className={`wb-pf-badge ${product.active ? "wb-pf-badge--approved" : "wb-pf-badge--neutral"}`}
                    >
                      {product.active ? "Active" : "Retired"}
                    </span>
                  </td>
                  <td>{formatDate(product.updated_at?.slice(0, 10))}</td>
                  <td>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(product)}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EditProductDialog product={editing} onClose={() => setEditing(null)} />
    </div>
  );
}

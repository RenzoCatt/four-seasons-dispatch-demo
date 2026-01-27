"use client";

import React from "react";

type LineItemsCardProps = {
  items: any[];
  taxRate?: number;
  readOnly?: boolean;
  onRemove?: (itemId: string) => void;
  disabled?: boolean;
  title?: string;
  // Field name mappings (for flexibility across different item types)
  descriptionField?: string;
  typeField?: string;
  qtyField?: string;
  unitPriceField?: string;
  taxableField?: string;
  totalField?: string;
  // Formatting
  moneyFormatter: (value: number) => string;
};

export default function LineItemsCard({
  items,
  taxRate = 0.05,
  readOnly = false,
  onRemove,
  disabled = false,
  title = "Line items",
  descriptionField = "description",
  typeField = "type",
  qtyField = "qty",
  unitPriceField = "unitPrice",
  taxableField = "taxable",
  totalField = "total",
  moneyFormatter,
}: LineItemsCardProps) {
  if (!items || items.length === 0) {
    return null;
  }

  // Read-only display mode (like work order cards)
  if (readOnly) {
    return (
      <div className="ui-item p-4">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">{title ?? "Line Items"}</div>
        </div>

        <div className="mt-4 border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-3 px-4 py-2 text-xs text-gray-500 bg-black/5">
            <div className="col-span-7">Item</div>
            <div className="col-span-2 text-right">Qty</div>
            <div className="col-span-1 text-right">Unit</div>
            <div className="col-span-2 text-right">Total</div>
          </div>

          {/* Rows */}
          {items.map((it: any) => {
            const qty = Number(it[qtyField] ?? 0);
            const unitCents = Number(it[unitPriceField] ?? 0);
            const totalCents = Number(it.total ?? qty * unitCents);
            const type = it[typeField];
            const typeLabel = type === "LABOR" ? "Labor" : type === "PART" ? "Part" : "Fee";

            return (
              <div key={it.id} className="grid grid-cols-12 gap-3 px-4 py-3 border-t">
                <div className="col-span-7">
                  <div className="text-sm font-medium">
                    {typeLabel}
                    <span className="ml-2 text-gray-400 text-xs">{type}</span>
                  </div>
                  <div className="text-sm text-gray-200 mt-1">
                    {it[descriptionField]}
                  </div>
                </div>

                <div className="col-span-2 text-right text-sm">{qty}</div>
                <div className="col-span-1 text-right text-sm">{moneyFormatter(unitCents)}</div>
                <div className="col-span-2 text-right text-sm font-semibold">
                  {moneyFormatter(totalCents)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Calculate totals
  const subtotal = items.reduce((sum, item) => {
    const qty = item[qtyField] || 0;
    const unitPrice = item[unitPriceField] || 0;
    return sum + qty * unitPrice;
  }, 0);

  const taxableTotal = items
    .filter((item) => item[taxableField] !== false)
    .reduce((sum, item) => {
      const qty = item[qtyField] || 0;
      const unitPrice = item[unitPriceField] || 0;
      return sum + qty * unitPrice;
    }, 0);

  const tax = taxableTotal * taxRate;
  const total = subtotal + tax;

  return (
    <div className="ui-card ui-card-pad">
      <div className="text-lg font-semibold mb-4">{title}</div>

      <div className="space-y-3">
        {items.map((item) => {
          const qty = item[qtyField] || 0;
          const unitPrice = item[unitPriceField] || 0;
          const itemTotal = qty * unitPrice;
          const itemType = item[typeField];
          const isTaxable = item[taxableField];
          const description = item[descriptionField];

          return (
            <div key={item.id} className="border rounded-lg p-3">
              <div className="grid grid-cols-12 gap-3 items-start">
                <div className="col-span-12 lg:col-span-7">
                  <div className="font-medium">{description}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {itemType} {isTaxable ? "• taxable" : ""}
                  </div>
                </div>

                <div className="col-span-6 lg:col-span-2">
                  <div className="text-xs text-gray-500 mb-1">Qty</div>
                  <div className="ui-item p-2">{qty}</div>
                </div>

                <div className="col-span-6 lg:col-span-2">
                  <div className="text-xs text-gray-500 mb-1">Unit</div>
                  <div className="ui-item p-2">{moneyFormatter(unitPrice)}</div>
                </div>

                <div className={readOnly ? "col-span-12 lg:col-span-1" : "col-span-10 lg:col-span-1"}>
                  <div className="text-xs text-gray-500 mb-1">Total</div>
                  <div className="font-semibold mt-2">{moneyFormatter(itemTotal)}</div>
                </div>

                {!readOnly && (
                  <div className="col-span-2 lg:col-span-0 flex justify-end">
                    <button
                      className="text-red-400 hover:text-red-300 disabled:opacity-50 text-xs"
                      disabled={disabled || !onRemove}
                      onClick={() => onRemove?.(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-600">Subtotal</div>
          <div className="font-medium">{moneyFormatter(subtotal)}</div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-600">
            Tax rate <span className="text-xs text-gray-500 ml-2">GST ({(taxRate * 100).toFixed(1)}%)</span>
          </div>
          <div className="font-medium">{moneyFormatter(tax)}</div>
        </div>

        <div className="border-t pt-3 flex items-center justify-between">
          <div className="text-lg font-semibold">Total</div>
          <div className="text-lg font-semibold">{moneyFormatter(total)}</div>
        </div>
      </div>
    </div>
  );
}

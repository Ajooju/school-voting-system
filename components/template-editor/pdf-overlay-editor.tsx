"use client";

import { useMemo, useState } from "react";
import { savePdfOverlayFields } from "@/lib/templates/actions";

type OverlayField = {
  fieldKey: string;
  label: string;
  fieldType: string;
  xPosition: number | null;
  yPosition: number | null;
  width: number | null;
  height: number | null;
  pageNumber: number | null;
  fontSize: number | null;
};

type PdfOverlayEditorProps = {
  fields: OverlayField[];
  pdfPreviewUrl: string;
  templateId: string;
  uploadedFileUrl: string;
};

const pageWidth = 595;
const pageHeight = 842;

export function PdfOverlayEditor({ fields, pdfPreviewUrl, templateId, uploadedFileUrl }: PdfOverlayEditorProps) {
  const [mappedFields, setMappedFields] = useState(() =>
    fields.map((field, index) => ({
      ...field,
      xPosition: field.xPosition ?? 48,
      yPosition: field.yPosition ?? 48 + index * 36,
      width: field.width ?? defaultWidthForField(field.fieldKey),
      height: field.height ?? defaultHeightForField(field.fieldKey),
      pageNumber: field.pageNumber ?? 1,
      fontSize: field.fontSize ?? 10,
    })),
  );
  const serializedFields = useMemo(() => JSON.stringify(mappedFields), [mappedFields]);

  function updateField(fieldKey: string, updates: Partial<OverlayField>) {
    setMappedFields((current) => current.map((field) => (field.fieldKey === fieldKey ? { ...field, ...updates } : field)));
  }

  function moveField(fieldKey: string, clientX: number, clientY: number, currentTarget: EventTarget & HTMLDivElement) {
    const rect = currentTarget.parentElement?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const xPosition = clamp(((clientX - rect.left) / rect.width) * pageWidth, 0, pageWidth);
    const yPosition = clamp(((clientY - rect.top) / rect.height) * pageHeight, 0, pageHeight);

    updateField(fieldKey, { xPosition, yPosition });
  }

  return (
    <form action={savePdfOverlayFields} className="space-y-6">
      <input name="id" type="hidden" value={templateId} />
      <input name="fieldsJson" type="hidden" value={serializedFields} />

      <div className="rounded-3xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 shadow-sm">
        <p className="font-semibold">Locked PDF background</p>
        <p className="mt-1">The PDF is stored separately and is not edited here. Drag only the mapped fields or fine tune their coordinates below.</p>
        <p className="mt-2 break-all text-xs text-sky-800">Original PDF: {uploadedFileUrl}</p>
      </div>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="overflow-auto rounded-3xl border border-slate-200 bg-slate-100 p-4 shadow-sm">
          <div className="relative mx-auto aspect-[595/842] w-full max-w-[595px] overflow-hidden rounded-2xl bg-white shadow">
            <iframe className="absolute inset-0 h-full w-full" src={pdfPreviewUrl} title="PDF template preview" />
            <div className="absolute inset-0">
              {mappedFields.map((field) => (
                <div
                  className="absolute cursor-move rounded border border-emerald-500 bg-emerald-100/70 px-2 py-1 text-[10px] font-semibold text-emerald-950 shadow-sm"
                  key={field.fieldKey}
                  onDragEnd={(event) => moveField(field.fieldKey, event.clientX, event.clientY, event.currentTarget)}
                  draggable
                  style={{
                    height: `${(field.height / pageHeight) * 100}%`,
                    left: `${(field.xPosition / pageWidth) * 100}%`,
                    top: `${(field.yPosition / pageHeight) * 100}%`,
                    width: `${(field.width / pageWidth) * 100}%`,
                  }}
                >
                  {field.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Mapped fields</h2>
          {mappedFields.map((field) => (
            <fieldset className="rounded-2xl border border-slate-200 p-3" key={field.fieldKey}>
              <legend className="px-1 text-sm font-semibold text-slate-950">{field.label}</legend>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <NumberInput label="X" onChange={(value) => updateField(field.fieldKey, { xPosition: value })} value={field.xPosition} />
                <NumberInput label="Y" onChange={(value) => updateField(field.fieldKey, { yPosition: value })} value={field.yPosition} />
                <NumberInput label="Width" onChange={(value) => updateField(field.fieldKey, { width: value })} value={field.width} />
                <NumberInput label="Height" onChange={(value) => updateField(field.fieldKey, { height: value })} value={field.height} />
                <NumberInput label="Page" onChange={(value) => updateField(field.fieldKey, { pageNumber: value })} value={field.pageNumber} />
                <NumberInput label="Font" onChange={(value) => updateField(field.fieldKey, { fontSize: value })} value={field.fontSize} />
              </div>
            </fieldset>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800" type="submit">
          Save mapped fields
        </button>
      </div>
    </form>
  );
}

function NumberInput({ label, onChange, value }: { label: string; onChange: (value: number) => void; value: number }) {
  return (
    <label className="space-y-1">
      <span className="font-semibold text-slate-600">{label}</span>
      <input className="w-full rounded-xl border border-slate-200 px-2 py-1" min="0" onChange={(event) => onChange(Number(event.target.value))} type="number" value={Math.round(value * 100) / 100} />
    </label>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function defaultWidthForField(fieldKey: string) {
  return fieldKey === "line_items_table" ? 500 : fieldKey === "business.logo" ? 96 : 180;
}

function defaultHeightForField(fieldKey: string) {
  return fieldKey === "line_items_table" ? 150 : fieldKey === "business.logo" ? 72 : 18;
}

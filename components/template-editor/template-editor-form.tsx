"use client";

import { useEffect, useRef, useState } from "react";
import { saveTemplate } from "@/lib/templates/actions";
import { defaultTemplateCss, defaultTemplateHtml, templatePlaceholders } from "@/lib/templates/placeholders";
import { renderTemplatePreview } from "@/lib/templates/preview";

type TemplateEditorTemplate = {
  id: string;
  name: string;
  templateType: string;
  htmlContent: string | null;
  cssContent: string | null;
  editorJson: unknown;
  isDefault: boolean;
  sourceType?: string;
  uploadedFileUrl?: string | null;
} | null;

type TemplateEditorFormProps = {
  template?: TemplateEditorTemplate;
};

type GrapesEditor = {
  getHtml: () => string;
  getCss: () => string;
  getProjectData: () => unknown;
  loadProjectData: (data: unknown) => void;
  setComponents: (html: string) => void;
  setStyle: (css: string) => void;
  destroy: () => void;
  BlockManager: {
    add: (id: string, block: { label: string; category: string; content: string; attributes?: Record<string, string> }) => void;
  };
};

export function TemplateEditorForm({ template = null }: TemplateEditorFormProps) {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<GrapesEditor | null>(null);
  const htmlInputRef = useRef<HTMLInputElement>(null);
  const cssInputRef = useRef<HTMLInputElement>(null);
  const editorJsonInputRef = useRef<HTMLInputElement>(null);
  const [previewHtml, setPreviewHtml] = useState(() => renderTemplatePreview(template?.htmlContent ?? defaultTemplateHtml, template?.cssContent ?? defaultTemplateCss));

  useEffect(() => {
    let mounted = true;

    async function initializeEditor() {
      const grapesjs = await import("grapesjs");

      if (!mounted || !editorContainerRef.current || editorRef.current) {
        return;
      }

      const editor = grapesjs.default.init({
        container: editorContainerRef.current,
        height: "720px",
        storageManager: false,
        fromElement: false,
        canvas: {
          styles: [],
        },
        blockManager: {
          appendTo: "#template-blocks",
        },
        panels: {
          defaults: [],
        },
      }) as GrapesEditor;

      templatePlaceholders.forEach((placeholder) => {
        editor.BlockManager.add(`placeholder-${placeholder.key}`, {
          label: placeholder.label,
          category: placeholder.category,
          content: placeholder.html,
          attributes: {
            title: placeholder.description,
          },
        });
      });

      if (template?.editorJson) {
        editor.loadProjectData(template.editorJson);
      } else {
        editor.setComponents(template?.htmlContent ?? defaultTemplateHtml);
        editor.setStyle(template?.cssContent ?? defaultTemplateCss);
      }

      editorRef.current = editor;
      syncEditorFields();
    }

    initializeEditor();

    return () => {
      mounted = false;
      editorRef.current?.destroy();
      editorRef.current = null;
    };
  }, [template]);

  function syncEditorFields() {
    const editor = editorRef.current;

    if (!editor || !htmlInputRef.current || !cssInputRef.current || !editorJsonInputRef.current) {
      return;
    }

    const htmlContent = editor.getHtml();
    const cssContent = editor.getCss();

    htmlInputRef.current.value = htmlContent;
    cssInputRef.current.value = cssContent;
    editorJsonInputRef.current.value = JSON.stringify(editor.getProjectData());
    setPreviewHtml(renderTemplatePreview(htmlContent, cssContent));
  }

  return (
    <form action={saveTemplate} className="space-y-6" onSubmit={syncEditorFields}>
      {template?.id ? <input name="id" type="hidden" value={template.id} /> : null}
      <input name="htmlContent" ref={htmlInputRef} type="hidden" defaultValue={template?.htmlContent ?? defaultTemplateHtml} />
      <input name="cssContent" ref={cssInputRef} type="hidden" defaultValue={template?.cssContent ?? defaultTemplateCss} />
      <input name="editorJson" ref={editorJsonInputRef} type="hidden" defaultValue={template?.editorJson ? JSON.stringify(template.editorJson) : ""} />

      {template?.sourceType === "DOCX_IMPORT" ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm">
          <p className="font-semibold">Imported DOCX template</p>
          <p className="mt-1">This template was converted from DOCX. The original file is stored separately and is not edited directly. The imported layout may need cleanup before use.</p>
          {template.uploadedFileUrl ? <p className="mt-2 break-all text-xs text-amber-800">Original DOCX: {template.uploadedFileUrl}</p> : null}
        </div>
      ) : null}

      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[2fr_1fr_auto] md:items-end">
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Template name</span>
          <input
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            name="name"
            required
            defaultValue={template?.name ?? ""}
            placeholder="Standard invoice template"
          />
        </label>
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Template type</span>
          <select
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
            name="templateType"
            defaultValue={template?.templateType?.toLowerCase() ?? "invoice"}
          >
            <option value="invoice">Invoice</option>
            <option value="quotation">Quotation</option>
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
          <input name="isDefault" type="checkbox" defaultChecked={template?.isDefault ?? false} />
          Default
        </label>
      </section>

      <section className="grid gap-6 xl:grid-cols-[260px_1fr]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">Blocks & placeholders</h2>
          <p className="mt-2 text-xs leading-5 text-slate-500">Drag blocks into the canvas or type placeholders like {"{{document.total}"} directly.</p>
          <div className="mt-4 space-y-2" id="template-blocks" />
        </aside>
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div ref={editorContainerRef} />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Preview with sample data</h2>
            <p className="mt-1 text-sm text-slate-600">Preview replaces placeholders with sample invoice/quotation values.</p>
          </div>
          <button
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            type="button"
            onClick={syncEditorFields}
          >
            Refresh preview
          </button>
        </div>
        <iframe className="mt-4 h-[640px] w-full rounded-2xl border border-slate-200 bg-white" sandbox="" srcDoc={previewHtml} title="Template preview" />
      </section>

      <div className="flex justify-end">
        <button className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800" type="submit">
          Save template
        </button>
      </div>
    </form>
  );
}

#!/usr/bin/env node
// Creates a Documenso signing template entirely from a PDF's own named
// AcroForm fields -- no manual drag-and-drop field placement in Documenso's
// editor. Design the PDF once in any tool that writes real form fields
// (Acrobat, LibreOffice, a form builder), name each field by convention
// below, and this reads their exact position/page straight off the PDF.
//
// Usage:
//   SIGNING_API_KEY=... node scripts/create-signing-template.mjs <path-to-pdf> "<title>"
//
// Field naming convention (case-insensitive prefix match on the PDF's own
// AcroForm field name):
//   signature / sign   -> FREE_SIGNATURE
//   initials           -> INITIALS
//   date                -> DATE
//   name                -> NAME
//   email               -> EMAIL
//   anything else       -> TEXT
//
// Prints the template id and a ready-to-use direct-link URL. Attach the
// template id to a mimosa agreement the normal way (Settings -> Agreements
// -> Create agreement -> paste the PDF back in for the record, or extend
// this script to also call our own /api/teams/:teamId/agreements if you
// want it to create the Agreement row directly -- not done here since that
// also needs an authenticated team session, not just the Documenso key).

import { Documenso } from "@documenso/sdk-typescript";
import { PDFDocument } from "pdf-lib";
import { readFileSync } from "fs";

const [, , pdfPath, titleArg] = process.argv;

if (!pdfPath) {
  console.error("Usage: node scripts/create-signing-template.mjs <path-to-pdf> [title]");
  process.exit(1);
}

const apiKey = process.env.SIGNING_API_KEY;
if (!apiKey) {
  console.error("SIGNING_API_KEY environment variable is required.");
  process.exit(1);
}

const FIELD_TYPE_RULES = [
  [/^sign(ature)?/i, "FREE_SIGNATURE"],
  [/^initials?/i, "INITIALS"],
  [/^date/i, "DATE"],
  [/^name/i, "NAME"],
  [/^email/i, "EMAIL"],
];

function resolveFieldType(fieldName) {
  for (const [pattern, type] of FIELD_TYPE_RULES) {
    if (pattern.test(fieldName)) return type;
  }
  return "TEXT";
}

async function extractFieldLayout(pdfBytes) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const form = pdfDoc.getForm();

  return form.getFields().flatMap((field) => {
    const name = field.getName();
    const type = resolveFieldType(name);

    return field.acroField.getWidgets().map((widget) => {
      const pageIndex = pages.findIndex((p) => p.ref === widget.P());
      if (pageIndex === -1) {
        throw new Error(`Field "${name}" isn't placed on any page.`);
      }
      const page = pages[pageIndex];
      const { width: pageWidth, height: pageHeight } = page.getSize();
      const rect = widget.getRectangle();

      return {
        name,
        type,
        pageNumber: pageIndex + 1,
        // pdf-lib rects are bottom-left origin in PDF points; Documenso's
        // pageX/pageY/width/height are top-left origin percentages of the
        // page, hence the height flip on Y.
        pageX: (rect.x / pageWidth) * 100,
        pageY: ((pageHeight - rect.y - rect.height) / pageHeight) * 100,
        width: (rect.width / pageWidth) * 100,
        height: (rect.height / pageHeight) * 100,
      };
    });
  });
}

async function main() {
  const pdfBytes = readFileSync(pdfPath);
  const layout = await extractFieldLayout(pdfBytes);

  if (layout.length === 0) {
    console.error(
      "No AcroForm fields found in this PDF. Add named form fields first (e.g. a field literally named \"signature\").",
    );
    process.exit(1);
  }

  console.log(`Found ${layout.length} field(s):`);
  for (const f of layout) {
    console.log(
      `  "${f.name}" -> ${f.type}  page ${f.pageNumber}  (${f.pageX.toFixed(1)}%, ${f.pageY.toFixed(1)}%) ${f.width.toFixed(1)}x${f.height.toFixed(1)}%`,
    );
  }

  const client = new Documenso({
    apiKey,
    serverURL: "https://app.documenso.com/api/v2",
  });

  const title = titleArg || pdfPath.split("/").pop().replace(/\.pdf$/i, "");

  const template = await client.templates.create({
    payload: {
      title,
      externalId: `mimosa-${Date.now()}`,
      meta: { subject: title, distributionMethod: "NONE" },
    },
    file: { fileName: `${title}.pdf`, content: new Uint8Array(pdfBytes) },
  });

  const recipientResult = await client.envelopes.recipients.createMany({
    envelopeId: template.envelopeId,
    data: [{ email: "", name: "Viewer", role: "SIGNER", signingOrder: 1 }],
  });
  const recipientId = recipientResult.data?.[0]?.id;
  if (!recipientId) {
    throw new Error("Documenso did not return a recipient id.");
  }

  await client.templates.fields.createMany({
    templateId: template.id,
    fields: layout.map((f) => ({
      type: f.type,
      recipientId,
      pageNumber: f.pageNumber,
      pageX: f.pageX,
      pageY: f.pageY,
      width: f.width,
      height: f.height,
    })),
  });

  console.log(`\nTemplate created: id ${template.id}`);
  console.log(
    "\nThis is Documenso-side only (no mimosa Agreement row yet). To use it, wire it to an",
    "Agreement in Settings -> Agreements the normal way, or extend this script to also POST",
    "to /api/teams/:teamId/agreements with signingTemplateId set to this template id.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

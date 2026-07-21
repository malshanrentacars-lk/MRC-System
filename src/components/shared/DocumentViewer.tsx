"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";

interface DocumentViewerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title?: string;
}

function isPdfUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return lower.endsWith('.pdf') || lower.includes('.pdf?');
}

export default function DocumentViewer({ open, onOpenChange, url, title = "Document" }: DocumentViewerProps) {
  const pdfContainerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const pdf = isPdfUrl(url);

  // Fetch the document as blob when opened
  useEffect(() => {
    if (!open || !url) return;
    setLoading(true);
    setError(null);

    if (!pdf) {
      // For images, just use the URL directly
      setBlobUrl(url);
      setLoading(false);
      return;
    }

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load (${res.status})`);
        return res.blob();
      })
      .then(blob => {
        setBlobUrl(URL.createObjectURL(blob));
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || "Could not load document");
        setLoading(false);
      });
  }, [open, url, pdf]);

  // Cleanup blob URL
  useEffect(() => {
    return () => {
      if (blobUrl && pdf) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl, pdf]);

  // Render PDF pages
  useEffect(() => {
    if (!open || !blobUrl || !pdf || !pdfContainerRef.current) return;

    let cancelled = false;
    const container = pdfContainerRef.current;
    container.innerHTML = "";

    const renderPdf = async () => {
      setLoading(true);
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

        const doc = await pdfjsLib.getDocument({ url: blobUrl }).promise;
        if (cancelled) return;

        for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
          if (cancelled) return;
          const page = await doc.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.5 });

          const pageWrap = document.createElement("div");
          pageWrap.className = "bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 mb-4";

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (!ctx) continue;

          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.display = "block";

          await page.render({ canvasContext: ctx, canvas, viewport }).promise;
          pageWrap.appendChild(canvas);
          container.appendChild(pageWrap);
        }
      } catch {
        if (!cancelled) {
          container.innerHTML = '<div class="w-full h-full flex items-center justify-center text-sm text-gray-500">Could not render PDF preview.</div>';
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    renderPdf();

    return () => {
      cancelled = true;
      if (container) container.innerHTML = "";
    };
  }, [open, blobUrl, pdf]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-5xl h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{title}</p>
            <p className="text-xs text-gray-500 truncate max-w-[60vw]">{url}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a href={url} target="_blank" rel="noopener noreferrer"
              className="px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-100">
              Open in new tab
            </a>
            <button type="button" onClick={() => onOpenChange(false)}
              className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800">
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-gray-100 overflow-auto p-4">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
            </div>
          ) : error ? (
            <div className="w-full h-full flex items-center justify-center text-sm text-red-500">{error}</div>
          ) : pdf ? (
            <div ref={pdfContainerRef} className="mx-auto max-w-4xl" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <img src={blobUrl || url} alt={title}
                className="max-w-full max-h-full object-contain rounded-lg"
                onError={() => setError("Could not load image")} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Upload, Loader2, FileText } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { uploadAsset, deleteAsset } from "@/app/actions/upload";

export interface UploadedFile {
  url: string;
  path: string;
  isNew?: boolean;
  id?: string;
}

interface FileUploaderProps {
  label: string;
  bucket: string;
  folder: string;
  accept?: string;
  multiple?: boolean;
  maxFiles?: number;
  maxFileSizeMB?: number;
  initialFiles?: UploadedFile[];
  /** Called when files change — use to sync state up to parent form */
  onChange?: (files: UploadedFile[]) => void;
  /** If provided, called instead of generic uploadAsset. Use for DB-linked uploads (e.g. vehicle photos) */
  customUploadAction?: (file: File) => Promise<{ error?: string; url?: string; path?: string; id?: string }>;
  /** If provided, called instead of generic deleteAsset. Use for DB-linked deletions */
  customDeleteAction?: (path: string, url: string, fileId?: string) => Promise<{ error?: string }>;
  /** Hidden input field name prefix. Files will be emitted as `{fieldName}_url` and `{fieldName}_path` */
  fieldName?: string;
}

export default function FileUploader({
  label,
  bucket,
  folder,
  accept = "image/*,.pdf",
  multiple = false,
  maxFiles = 10,
  maxFileSizeMB,
  initialFiles = [],
  onChange,
  customUploadAction,
  customDeleteAction,
  fieldName,
}: FileUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>(initialFiles);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  // Derive fieldName from label if not provided (e.g. "NIC Front" → "nic_front")
  const resolvedFieldName = fieldName ?? label.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "").toLowerCase();

  const updateFiles = (newFiles: UploadedFile[]) => {
    setFiles(newFiles);
    onChange?.(newFiles);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    if (files.length + selectedFiles.length > maxFiles) {
      toast({
        title: "Upload limit reached",
        description: `You can only upload up to ${maxFiles} file(s).`,
        variant: "destructive",
      });
      return;
    }

    if (maxFileSizeMB && maxFileSizeMB > 0) {
      const maxBytes = maxFileSizeMB * 1024 * 1024;
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        if (file.size > maxBytes) {
          toast({
            title: "File too large",
            description: `${file.name} exceeds ${maxFileSizeMB}MB limit.`,
            variant: "destructive",
          });
          e.target.value = "";
          return;
        }
      }
    }

    startTransition(async () => {
      const newUploads: UploadedFile[] = [];

      toast({ title: "Uploading...", description: "Please wait." });

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        let res: { error?: string; url?: string; path?: string; id?: string };

        if (customUploadAction) {
          res = await customUploadAction(file);
        } else {
          res = await uploadAsset(bucket, folder, file);
        }

        if (res.error || !res.url || !res.path) {
          toast({
            title: "Upload Failed",
            description: res.error ?? "Unknown error",
            variant: "destructive",
          });
          continue;
        }

        newUploads.push({ url: res.url, path: res.path, id: res.id, isNew: true });
      }

      if (newUploads.length > 0) {
        // If single-file mode, replace; else append
        const updatedFiles = multiple ? [...files, ...newUploads] : [newUploads[0]];
        updateFiles(updatedFiles);
        toast({ title: "Uploaded", description: `${newUploads.length} file(s) uploaded successfully.` });
      }

      // Reset the file input so same file can be re-selected
      e.target.value = "";
    });
  };

  const handleDelete = async (fileToDelete: UploadedFile) => {
    startTransition(async () => {
      toast({ title: "Deleting...", description: "Please wait." });

      let error: string | null = null;

      if (customDeleteAction) {
        const res = await customDeleteAction(fileToDelete.path, fileToDelete.url, fileToDelete.id);
        if (res?.error) error = res.error;
      } else {
        // Always try to remove from storage
        const res = await deleteAsset(bucket, fileToDelete.path);
        if (res?.error) error = res.error;
      }

      if (error) {
        toast({ title: "Delete Failed", description: error, variant: "destructive" });
        return;
      }

      const newFiles = files.filter((f) => f.path !== fileToDelete.path);
      updateFiles(newFiles);
      toast({ title: "Deleted", description: "File removed." });
    });
  };

  const inputId = `file-upload-${resolvedFieldName}-${bucket}`;

  return (
    <div className="space-y-2">
      <label className="form-label mb-0 block text-xs font-medium text-gray-700">{label}</label>

      {/* Preview area */}
      {files.length > 0 && (
        <div className={`grid gap-2 ${multiple ? "grid-cols-2 md:grid-cols-3" : "grid-cols-1"}`}>
          {files.map((file, i) => (
            <div
              key={`${file.path}-${i}`}
              className="group relative rounded-xl border border-gray-200 overflow-hidden bg-gray-50"
              style={{ aspectRatio: "16/9" }}
            >
              {file.url.match(/\.pdf($|\?)/) ? (
                <div className="flex flex-col items-center justify-center w-full h-full text-red-500 p-2">
                  <FileText className="w-8 h-8 mb-1" />
                  <span className="text-[10px] font-semibold text-gray-600 block truncate max-w-full text-center">PDF</span>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-blue-500 hover:underline mt-0.5"
                  >
                    Open
                  </a>
                </div>
              ) : file.url ? (
                <Image src={file.url} alt={`upload-${i}`} fill className="object-cover" unoptimized />
              ) : null}

              {/* Hover overlay with delete */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 z-10">
                {!file.url.match(/\.pdf($|\?)/) && (
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-white text-[10px] underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View
                  </a>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); handleDelete(file); }}
                  disabled={isPending}
                  className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload button — shown when no file or multiple mode */}
      {(multiple || files.length === 0) && files.length < maxFiles && (
        <div>
          <input
            id={inputId}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleUpload}
            disabled={isPending}
            className="hidden"
          />
          <label
            htmlFor={inputId}
            className={`flex items-center justify-center gap-2 border-2 border-dashed border-blue-200 bg-blue-50/40 hover:bg-blue-50 text-blue-600 text-xs font-medium px-4 py-3 rounded-xl cursor-pointer transition-colors select-none ${
              isPending ? "opacity-50 pointer-events-none" : ""
            }`}
          >
            {isPending ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="w-3.5 h-3.5" /> {files.length > 0 ? `Upload another ${label}` : `Upload ${label}`}</>
            )}
          </label>
        </div>
      )}

      {/* Hidden inputs so parent <form> picks up the URLs on submit.
          IMPORTANT: always render even when empty — empty string = "field was cleared" → server sets DB to null */}
      {files.length > 0 ? (
        files.map((f, i) => (
          <span key={`h-${i}`}>
            <input type="hidden" name={`${resolvedFieldName}_url`} value={f.url} />
            <input type="hidden" name={`${resolvedFieldName}_path`} value={f.path || f.url} />
          </span>
        ))
      ) : (
        <>
          <input type="hidden" name={`${resolvedFieldName}_url`} value="" />
          <input type="hidden" name={`${resolvedFieldName}_path`} value="" />
        </>
      )}
    </div>
  );
}

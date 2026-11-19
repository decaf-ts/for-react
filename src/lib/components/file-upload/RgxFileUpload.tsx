import React, { useCallback, useEffect, useRef, useState } from "react";
import { OperationKeys } from "@decaf-ts/db-decorators";
import { IFileUploadError } from "../../engine/interfaces.js";
import { translateKey } from "../../services/RgxTranslateService.js";

/**
 * @description Public props accepted by the {@link RgxFileUpload} component.
 * @summary Describes the file input's identity, accepted types, size limit,
 * value serialization mode and callbacks. The `value` prop is parsed as JSON
 * when possible and may describe either plain data-URL strings or records with
 * `name`, `size`, `type` and `source` fields. `maxFileSize` is expressed in
 * megabytes and `valueType` selects whether emitted payloads contain raw
 * base64 sources or file metadata objects.
 * @memberOf module:for-react
 */
export interface RgxFileUploadProps {
  name?: string;
  label?: string;
  operation?: OperationKeys;
  required?: boolean;
  multiple?: boolean;
  type?: string;
  valueType?: "base64" | "files";
  buttonLabel?: string;
  size?: "large" | "small" | "default" | string;
  position?: string;
  accept?: string | string[];
  showIcon?: boolean;
  enableDirectoryMode?: boolean;
  maxFileSize?: number;
  value?: string;
  disabled?: boolean;
  className?: string;
  locale?: string;
  previewHandler?: (file: File | string, options?: unknown) => unknown;
  onChange?: (value: string) => void;
  onPreview?: (source: string, type?: string) => void;
}

interface UploadFile {
  name: string;
  size: number;
  type: string;
  source?: string;
  file?: File;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * @description File selection control with drag-and-drop, validation and preview.
 * @summary Renders a hidden file input plus a clickable drop area. In `CREATE`
 * and `UPDATE` operations files can be selected or dropped, are validated
 * against `accept` and `maxFileSize`, and are converted to data URLs before a
 * JSON payload is emitted through `onChange`. In any other operation the
 * component renders a read-only list of the files described by `value`.
 * Selecting more than one file is only retained when `multiple` or
 * `enableDirectoryMode` is set; otherwise a single file is kept. Dropped files
 * are only accepted while the list is empty. `previewHandler` takes precedence
 * over `onPreview` when a file is previewed.
 * @param {RgxFileUploadProps} props - Component properties.
 * @returns {React.ReactElement | null} The rendered upload control, or a
 * read-only preview list for non-editable operations.
 * @example
 * ```tsx
 * <RgxFileUpload
 *   name="attachment"
 *   label="Attachments"
 *   multiple
 *   accept={["image/*", "application/pdf"]}
 *   onChange={(payload) => console.log(payload)}
 * />
 * ```
 * @memberOf module:for-react
 */
export const RgxFileUpload: React.FC<RgxFileUploadProps> = ({
  name = "file",
  label,
  operation = OperationKeys.CREATE,
  required = false,
  multiple = false,
  valueType = "base64",
  buttonLabel,
  size = "large",
  position = "center",
  accept = ["image/*"],
  showIcon = true,
  enableDirectoryMode = false,
  maxFileSize = 1,
  value = "",
  disabled = false,
  className = "",
  locale = "fileUpload",
  previewHandler,
  onChange,
  onPreview,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [errors, setErrors] = useState<IFileUploadError[]>([]);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | undefined>();

  const editable =
    operation === OperationKeys.CREATE || operation === OperationKeys.UPDATE;
  const acceptValue = Array.isArray(accept) ? accept.join(",") : accept;
  const maxBytes = maxFileSize * 1024 * 1024;

  useEffect(() => {
    if (!value) {
      setFiles([]);
      setPreview(undefined);
      return;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = value;
    }
    const list = Array.isArray(parsed) ? parsed : [parsed];
    const mapped = list
      .map((entry) => {
        if (typeof entry === "string") {
          return { name: "file", size: 0, type: "image/*", source: entry };
        }
        if (entry && typeof entry === "object") {
          const record = entry as Record<string, unknown>;
          return {
            name: String(record.name || "file"),
            size: Number(record.size || 0),
            type: String(record.type || "image/*"),
            source: record.source ? String(record.source) : undefined,
          };
        }
        return undefined;
      })
      .filter(Boolean) as UploadFile[];
    setFiles(mapped);
    setPreview(mapped[0]?.source);
  }, [value]);

  const validateFile = useCallback(
    (file: File): true | string => {
      if (acceptValue && acceptValue !== "*") {
        const accepted = acceptValue.split(",").map((ext) => ext.trim());
        const isValid = accepted.some((ext) => {
          if (ext === "*") return true;
          if (ext.endsWith("/*")) return file.type.startsWith(ext.replace(/\/\*$/, ""));
          const extension = file.type.split("/").pop() || "";
          return (
            file.type === ext ||
            extension === ext ||
            file.name.toLowerCase().endsWith(ext.replace(".", ""))
          );
        });
        if (!isValid) return "not_allowed";
      }
      if (maxBytes && file.size > maxBytes) return "max_size";
      return true;
    },
    [acceptValue, maxBytes]
  );

  const commit = useCallback(
    async (incoming: File[]) => {
      const nextErrors: IFileUploadError[] = [];
      const valid: UploadFile[] = [];
      for (const file of incoming) {
        const result = validateFile(file);
        if (result === true) {
          valid.push({
            name: file.name,
            size: file.size,
            type: file.type,
            file,
          });
        } else {
          nextErrors.push({ name: file.name, size: file.size, error: result });
        }
      }
      setErrors(nextErrors);
      const merged = multiple || enableDirectoryMode
        ? [...files, ...valid]
        : valid.slice(0, 1);
      const enriched = await Promise.all(
        merged.map(async (entry) => ({
          ...entry,
          source: entry.file ? await fileToDataUrl(entry.file) : entry.source,
        }))
      );
      setFiles(enriched);
      setPreview(enriched[0]?.source);
      const payload =
        valueType === "base64"
          ? JSON.stringify(enriched.map((entry) => entry.source))
          : JSON.stringify(
              enriched.map((entry) => ({
                name: entry.name,
                size: entry.size,
                type: entry.type,
                source: entry.source,
              }))
            );
      onChange?.(payload);
    },
    [files, multiple, enableDirectoryMode, valueType, validateFile, onChange]
  );

  const handleInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = "";
    commit(selected);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    if (!files.length) commit(Array.from(event.dataTransfer.files || []));
  };

  const remove = (index: number) => {
    const next = files.filter((_, itemIndex) => itemIndex !== index);
    setFiles(next);
    setPreview(next[0]?.source);
    onChange?.(
      JSON.stringify(
        valueType === "base64"
          ? next.map((entry) => entry.source)
          : next.map((entry) => ({
              name: entry.name,
              size: entry.size,
              type: entry.type,
              source: entry.source,
            }))
      )
    );
  };

  const handlePreview = async (entry: UploadFile) => {
    const source =
      entry.source ||
      (entry.file ? await fileToDataUrl(entry.file) : undefined);
    if (!source) return;
    setPreview(source);
    if (previewHandler) {
      await previewHandler(entry.file || source, { data: source });
      return;
    }
    onPreview?.(source, entry.type);
  };

  const clear = () => {
    setFiles([]);
    setErrors([]);
    setPreview(undefined);
    onChange?.("");
  };

  if (!editable) {
    return (
      <div className={["dcf-file-component read", className].filter(Boolean).join(" ")}>
        {label && <span className="dcf-title">{label}</span>}
        {!files.length ? (
          <div className="dcf-padding-xsmall">
            {translateKey(`${locale}.empty`) || "No files"}
          </div>
        ) : (
          <ul className="dcf-preview-list">
            {files.map((entry, index) => (
              <li key={index}>
                <button type="button" onClick={() => handlePreview(entry)}>
                  {entry.name || name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className={["dcf-file-component", className].filter(Boolean).join(" ")}>
      <input
        ref={inputRef}
        id={`file-${name}`}
        type="file"
        aria-label={translateKey(`${locale}.buttons.select`) || "Select file"}
        accept={acceptValue}
        multiple={multiple}
        hidden
        disabled={disabled}
        onChange={handleInput}
        {...(enableDirectoryMode ? { webkitdirectory: "" } : {})}
      />
      <div
        className={[
          "dcf-drop-area",
          `dcf-${size}`,
          `dcf-flex dcf-flex-${position}`,
          `dcf-text-${position}`,
          dragging ? "dcf-dragging" : "",
          files.length ? "dcf-has-files" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        role="group"
        aria-label={label || translateKey(`${locale}.drag_file`) || "Drop file"}
        onDrop={handleDrop}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
      >
        {!files.length || multiple ? (
          <div>
            {showIcon && <span className="dcf-icon">cloud-upload</span>}
            <p className="dcf-drag-description">
              {label || translateKey(`${locale}.drag_file`) || "Drag a file here"}
            </p>
            <button
              type="button"
              className="dcf-button small"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
            >
              {buttonLabel ||
                translateKey(
                  `${locale}.buttons.${
                    enableDirectoryMode ? "select_directory" : "select"
                  }`
                ) ||
                "Select"}
            </button>
            {required && <span className="dcf-required">*</span>}
          </div>
        ) : null}

        {files.length > 0 && (
          <ul className="dcf-preview-list">
            {errors.map((error, index) => (
              <li key={`error-${index}`} className="dcf-error-item" role="alert">
                {error.name}: {error.error}
              </li>
            ))}
            {files.map((entry, index) => (
              <li key={index}>
                <span>{entry.name}</span>
                <button
                  type="button"
                  aria-label={translateKey(`${locale}.buttons.preview`)}
                  onClick={() => handlePreview(entry)}
                >
                  Preview
                </button>
                <button
                  type="button"
                  aria-label={translateKey(`${locale}.buttons.remove`)}
                  onClick={() => remove(index)}
                >
                  Remove
                </button>
              </li>
            ))}
            <li>
              <button type="button" onClick={clear}>
                {translateKey(`${locale}.buttons.clear`) || "Clear"}
              </button>
            </li>
          </ul>
        )}
        {preview && !multiple && (
          <div className="dcf-preview-image">
            <img src={preview} alt={translateKey(`${locale}.preview`) || "Preview"} />
          </div>
        )}
      </div>
    </div>
  );
};

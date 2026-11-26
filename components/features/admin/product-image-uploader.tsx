'use client';

import Image from 'next/image';
import {
  AlertCircle,
  CheckCircle2,
  ImageOff,
  ImagePlus,
  LoaderCircle,
  Plus,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent, ReactElement } from 'react';
import { isValidMediaUrl } from '@/lib/admin/products-validation';
import { isOptimizedImageSrc } from '@/lib/market/product-presenter';
import {
  MAX_PRODUCT_IMAGES,
  PRODUCT_IMAGE_ACCEPT,
  uploadProductImageFile,
  validateProductImageFile,
} from '@/lib/storage/uploadProductImage';
import { getSupabaseBrowserClient, isSupabaseAuthConfigured } from '@/lib/supabase/client';

interface ProductImageUploaderProps {
  readonly images: readonly string[];
  readonly productSlug: string;
  readonly isUploading: boolean;
  readonly onUploadingChange: (uploading: boolean) => void;
  readonly onChangeImages: (nextImages: string[]) => void;
  readonly onSessionUploaded?: (url: string) => void;
  readonly onRemoveImage?: (url: string) => void;
}

export function ProductImageUploader({
  images,
  productSlug,
  isUploading,
  onUploadingChange,
  onChangeImages,
  onSessionUploaded,
  onRemoveImage,
}: ProductImageUploaderProps): ReactElement {
  const fileInputId = useId();
  const urlInputId = useId();

  const [isDragActive, setIsDragActive] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState<{
    readonly done: number;
    readonly total: number;
  } | null>(null);
  const [localError, setLocalError] = useState('');
  const [localNotice, setLocalNotice] = useState('');

  const noticeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current !== null) {
        window.clearTimeout(noticeTimerRef.current);
      }
    };
  }, []);

  const showNotice = (message: string) => {
    if (noticeTimerRef.current !== null) {
      window.clearTimeout(noticeTimerRef.current);
    }
    setLocalNotice(message);
    noticeTimerRef.current = window.setTimeout(() => {
      noticeTimerRef.current = null;
      setLocalNotice('');
    }, 4000);
  };

  const remainingSlots = Math.max(0, MAX_PRODUCT_IMAGES - images.length);
  const isAtLimit = remainingSlots === 0;

  const processFiles = async (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    if (incoming.length === 0 || isUploading) return;

    setLocalError('');
    if (remainingSlots <= 0) {
      setLocalError(`Maksimal ${MAX_PRODUCT_IMAGES} foto per produk telah tercapai.`);
      return;
    }

    let filesToProcess = incoming;
    let slotLimitNote = '';
    if (incoming.length > remainingSlots) {
      filesToProcess = incoming.slice(0, remainingSlots);
      slotLimitNote = ` Hanya ${remainingSlots} foto pertama diproses karena batas maksimal ${MAX_PRODUCT_IMAGES} foto.`;
    }

    const validFiles: File[] = [];
    const validationErrors: string[] = [];

    for (const file of filesToProcess) {
      const check = validateProductImageFile(file);
      if (check.ok) {
        validFiles.push(file);
      } else {
        validationErrors.push(check.error);
      }
    }

    if (validFiles.length === 0) {
      setLocalError(validationErrors[0] ?? 'Format foto tidak valid.');
      return;
    }

    if (!isSupabaseAuthConfigured) {
      setLocalError('Konfigurasi Supabase belum aktif untuk unggah foto.');
      return;
    }

    onUploadingChange(true);
    setUploadProgress({ done: 0, total: validFiles.length });

    let nextImages = [...images];
    let uploadedCount = 0;
    let usedFallback = false;
    const uploadErrors = [...validationErrors];

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error('Sesi admin berakhir. Silakan login ulang untuk mengunggah foto.');
      }

      for (let idx = 0; idx < validFiles.length; idx += 1) {
        const currentFile = validFiles[idx];
        if (!currentFile) continue;

        try {
          const uploaded = await uploadProductImageFile({
            file: currentFile,
            userId: user.id,
            productSlug,
          });
          if (!nextImages.includes(uploaded.url)) {
            nextImages = [...nextImages, uploaded.url];
            onChangeImages(nextImages);
          }
          onSessionUploaded?.(uploaded.url);
          uploadedCount += 1;
          if (uploaded.usedFallbackBucket) {
            usedFallback = true;
          }
        } catch (err: unknown) {
          uploadErrors.push(
            err instanceof Error ? err.message : `Gagal mengunggah "${currentFile.name}".`,
          );
        } finally {
          setUploadProgress({ done: idx + 1, total: validFiles.length });
        }
      }

      if (uploadedCount > 0) {
        const baseNotice =
          uploadedCount === 1
            ? 'Foto produk berhasil diunggah.'
            : `${uploadedCount} foto produk berhasil diunggah.`;
        const bucketNote = usedFallback
          ? ' (Menggunakan bucket cadangan post-media sebelum bucket product-images diterapkan.)'
          : '';
        showNotice(`${baseNotice}${bucketNote}${slotLimitNote}`);
      }

      if (uploadErrors.length > 0) {
        setLocalError(uploadErrors.join(' '));
      } else if (slotLimitNote && uploadedCount === 0) {
        setLocalError(slotLimitNote.trim());
      }
    } catch (err: unknown) {
      setLocalError(
        err instanceof Error ? err.message : 'Terjadi kesalahan saat mengunggah foto produk.',
      );
    } finally {
      setUploadProgress(null);
      onUploadingChange(false);
    }
  };

  const handleFileInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { files } = event.target;
    if (files && files.length > 0) {
      void processFiles(files);
    }
    event.target.value = '';
  };

  const handleDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isUploading && !isAtLimit) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
    if (isUploading || isAtLimit) return;

    const files = event.dataTransfer.files;
    if (files && files.length > 0) {
      void processFiles(files);
    }
  };

  const handleAddExternalUrl = () => {
    setLocalError('');
    const candidate = imageUrlInput.trim();
    if (!candidate) return;

    if (isAtLimit) {
      setLocalError(`Maksimal ${MAX_PRODUCT_IMAGES} foto per produk.`);
      return;
    }
    if (!isValidMediaUrl(candidate)) {
      setLocalError('URL gambar harus diawali https://, http://, atau /images/...');
      return;
    }
    if (images.includes(candidate)) {
      setLocalError('URL gambar ini sudah ada dalam galeri.');
      return;
    }

    onChangeImages([...images, candidate]);
    setImageUrlInput('');
    showNotice('URL foto eksternal ditambahkan ke galeri.');
  };

  const handleMakePrimary = (index: number) => {
    if (index <= 0 || index >= images.length) return;
    const selectedUrl = images[index];
    if (!selectedUrl) return;

    const reordered = [selectedUrl, ...images.filter((_, itemIdx) => itemIdx !== index)];
    onChangeImages(reordered);
    showNotice('Foto utama diperbarui.');
  };

  const handleRemove = (index: number) => {
    const targetUrl = images[index];
    if (!targetUrl) return;

    const remaining = images.filter((_, itemIdx) => itemIdx !== index);
    onChangeImages(remaining);
    onRemoveImage?.(targetUrl);
    showNotice('Foto dihapus dari daftar galeri.');
  };

  return (
    <section className="space-y-4 rounded-xl border border-default bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="tracking-tight flex items-center gap-2 text-sm font-bold text-primary">
            <ImagePlus className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            <span>Galeri Foto Produk</span>
          </h3>
          <p className="mt-0.5 text-xs text-secondary">
            Foto urutan pertama otomatis menjadi Foto Utama di kartu Market.
          </p>
        </div>

        <span className="rounded-md border border-default bg-canvas px-2.5 py-1 font-mono text-xs font-semibold tabular-nums text-primary">
          {images.length}/{MAX_PRODUCT_IMAGES} foto
        </span>
      </div>

      {/* Drag & Drop + Multi-File Picker Zone */}
      <label
        htmlFor={fileInputId}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 text-center transition-colors ${
          isAtLimit || isUploading
            ? 'cursor-not-allowed border-default bg-subtle/70 opacity-70'
            : isDragActive
              ? 'cursor-pointer border-accent-primary bg-accent-subtle'
              : 'cursor-pointer border-default bg-canvas hover:border-accent-primary/60 hover:bg-accent-subtle/40'
        }`}
      >
        {isUploading ? (
          <>
            <LoaderCircle
              className="h-6 w-6 animate-spin text-accent-primary"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span className="text-sm font-semibold text-primary">
              Mengunggah foto...{' '}
              {uploadProgress && uploadProgress.total > 1
                ? `(${uploadProgress.done}/${uploadProgress.total})`
                : ''}
            </span>
          </>
        ) : (
          <>
            <Upload className="h-6 w-6 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
            <span className="text-sm font-semibold text-primary">
              {isAtLimit
                ? `Batas maksimal ${MAX_PRODUCT_IMAGES} foto tercapai`
                : 'Tarik & lepas foto produk di sini, atau pilih file'}
            </span>
            <span className="text-xs text-secondary">
              Maks. 5MB (JPG, PNG, WebP) · Maksimal {MAX_PRODUCT_IMAGES} foto
            </span>
          </>
        )}
        <input
          id={fileInputId}
          type="file"
          multiple
          accept={PRODUCT_IMAGE_ACCEPT}
          disabled={isUploading || isAtLimit}
          onChange={handleFileInputChange}
          className="sr-only"
        />
      </label>

      {localError ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-status-danger/30 bg-red-50 p-3 text-xs text-status-danger"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
          <span>{localError}</span>
        </p>
      ) : null}

      {localNotice ? (
        <p
          role="status"
          aria-live="polite"
          className="flex items-start gap-2 rounded-lg border border-default bg-canvas p-3 text-xs font-medium text-primary"
        >
          <CheckCircle2
            className="mt-0.5 h-4 w-4 shrink-0 text-status-live"
            strokeWidth={1.75}
            aria-hidden="true"
          />
          <span>{localNotice}</span>
        </p>
      ) : null}

      {/* Thumbnail Previews Grid */}
      {images.length > 0 ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((url, index) => {
            const isPrimary = index === 0;
            const hasFailed = Boolean(failedImages[url]);
            return (
              <li
                key={`${url}-${index}`}
                className={`flex flex-col justify-between overflow-hidden rounded-xl bg-canvas transition-colors ${
                  isPrimary
                    ? 'border-2 border-accent-primary ring-2 ring-accent-primary/20'
                    : 'border border-default'
                }`}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface">
                  {hasFailed ? (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 p-3 text-center text-secondary">
                      <ImageOff className="h-6 w-6" strokeWidth={1.5} aria-hidden="true" />
                      <span className="text-[11px]">Gagal memuat pratinjau</span>
                    </div>
                  ) : (
                    <Image
                      src={url}
                      alt={`Foto produk ${index + 1}`}
                      fill
                      sizes="(min-width: 1024px) 200px, (min-width: 640px) 45vw, 90vw"
                      unoptimized={!isOptimizedImageSrc(url)}
                      onError={() =>
                        setFailedImages((current) => ({ ...current, [url]: true }))
                      }
                      className="object-cover"
                    />
                  )}

                  {isPrimary ? (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-md bg-accent-cta px-2 py-0.5 text-[11px] font-semibold text-accent-foreground shadow-sm">
                      <Star className="h-3 w-3 fill-current" strokeWidth={1.75} aria-hidden="true" />
                      <span>Foto Utama</span>
                    </span>
                  ) : (
                    <span className="absolute left-2 top-2 rounded-md border border-default bg-surface/95 px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-primary shadow-sm">
                      #{index + 1}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 border-t border-default bg-surface p-2">
                  {isPrimary ? (
                    <span className="flex min-h-11 flex-1 items-center justify-center px-2 text-center text-xs font-semibold text-accent-cta">
                      Tampil di Kartu Market
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => handleMakePrimary(index)}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg border border-default bg-subtle px-2.5 py-2 text-xs font-medium text-primary transition hover:border-accent-primary/50 hover:bg-accent-subtle disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
                    >
                      <Star className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                      <span>Jadikan Foto Utama</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={() => handleRemove(index)}
                    aria-label={`Hapus foto ${index + 1}`}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-default bg-canvas text-secondary transition hover:border-status-danger/45 hover:bg-red-50 hover:text-status-danger disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-secondary">
          Belum ada foto. Unggah foto produk langsung dari perangkat Anda atau tempel URL gambar di bawah.
        </p>
      )}

      {/* Optional External Image URL Fallback */}
      <div className="border-t border-default pt-3">
        <label
          htmlFor={urlInputId}
          className="mb-1.5 block text-xs font-medium text-secondary"
        >
          Tempel URL gambar eksternal (opsional)
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={urlInputId}
            type="text"
            value={imageUrlInput}
            disabled={isUploading || isAtLimit}
            onChange={(event) => setImageUrlInput(event.target.value)}
            placeholder="/images/hero/pc-rig.jpg atau https://..."
            className="min-h-11 flex-1 rounded-lg border border-default bg-subtle px-3 py-2 font-mono text-xs text-primary outline-none transition placeholder:text-secondary/65 focus:border-accent-primary focus:bg-surface focus:ring-2 focus:ring-accent-primary/20 disabled:opacity-55"
          />
          <button
            type="button"
            disabled={isUploading || isAtLimit || !imageUrlInput.trim()}
            onClick={handleAddExternalUrl}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-accent-primary px-4 py-2 text-xs font-semibold text-white transition-all duration-200 ease-smooth hover:bg-accent-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/50"
          >
            <Plus className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            <span>Tambah URL</span>
          </button>
        </div>
      </div>
    </section>
  );
}

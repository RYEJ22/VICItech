'use client';

import {
  AlertCircle,
  Code2,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import {
  isProductCategory,
  isProductSellerType,
  isProductStockStatus,
  parseJsonObject,
  parsePresetComponents,
  parseProductSpecs,
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_SELLER_TYPES,
  PRODUCT_STOCK_STATUSES,
  resolveProductImages,
  SELLER_TYPE_LABELS,
  slugifyProductTitle,
  specEntriesToJson,
  STOCK_STATUS_LABELS,
  validateProductPayload,
} from '@/lib/admin/products-validation';
import type {
  PresetComponentEntry,
  ProductCategory,
  ProductFormPayload,
  ProductRow,
  ProductSellerType,
  ProductSpecEntry,
  ProductStockStatus,
} from '@/lib/admin/products-validation';
import { deleteProductImageFromStorage } from '@/lib/storage/uploadProductImage';
import type { Json } from '@/types/database.types';
import { createProductAction, updateProductAction } from '@/app/admin/products/actions';
import { AdminDrawer } from './admin-drawer';
import { ProductImageUploader } from './product-image-uploader';

interface ProductEditorDrawerProps {
  readonly open: boolean;
  readonly product: ProductRow | null;
  readonly onClose: () => void;
  readonly onSaved: (saved: ProductRow, mode: 'create' | 'edit') => void;
}

const inputClass =
  'min-h-11 w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary outline-none transition placeholder:text-secondary/65 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 disabled:opacity-55';
const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-secondary';

export function ProductEditorDrawer({
  open,
  product,
  onClose,
  onSaved,
}: ProductEditorDrawerProps): ReactElement {
  const isEditing = Boolean(product);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [category, setCategory] = useState<ProductCategory>('pc-build');
  const [sellerType, setSellerType] = useState<ProductSellerType>('vicitech');
  const [stockStatus, setStockStatus] = useState<ProductStockStatus>('ready');

  const [images, setImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const persistedImagesRef = useRef<Set<string>>(new Set());
  const sessionUploadedUrlsRef = useRef<Set<string>>(new Set());
  const removedPersistedUrlsRef = useRef<Set<string>>(new Set());

  const [specEntries, setSpecEntries] = useState<ProductSpecEntry[]>([]);
  const [rawSpecsText, setRawSpecsText] = useState('{}');
  const [isJsonMode, setIsJsonMode] = useState(false);

  const [isPreset, setIsPreset] = useState(false);
  const [presetComponents, setPresetComponents] = useState<PresetComponentEntry[]>([]);

  const [reviewedByName, setReviewedByName] = useState('');
  const [reviewedByAvatar, setReviewedByAvatar] = useState('');
  const [reviewQuote, setReviewQuote] = useState('');
  const [reviewVideoUrl, setReviewVideoUrl] = useState('');

  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;

    setErrorMessage('');
    setIsJsonMode(false);
    sessionUploadedUrlsRef.current.clear();
    removedPersistedUrlsRef.current.clear();

    if (product) {
      const initialImages = resolveProductImages(product);
      persistedImagesRef.current = new Set(initialImages);
      setTitle(product.title);
      setSlug(product.slug);
      setSlugTouched(true);
      setDescription(product.description);
      setPrice(String(product.price));
      setCategory(product.category);
      setSellerType(product.seller_type);
      setStockStatus(product.stock_status);
      setImages(initialImages);
      const parsedSpecs = parseProductSpecs(product.specs);
      setSpecEntries(
        parsedSpecs.length > 0 ? parsedSpecs : [{ id: 'spec-init', key: '', value: '' }],
      );
      setRawSpecsText(JSON.stringify(product.specs ?? {}, null, 2));
      setIsPreset(product.is_preset);
      const parsedPresets = parsePresetComponents(product.preset_components);
      setPresetComponents(
        parsedPresets.length > 0 ? parsedPresets : [{ id: 'preset-init', slot: '', name: '' }],
      );
      setReviewedByName(product.reviewed_by_name ?? '');
      setReviewedByAvatar(product.reviewed_by_avatar ?? '');
      setReviewQuote(product.review_quote ?? '');
      setReviewVideoUrl(product.review_video_url ?? '');
    } else {
      persistedImagesRef.current = new Set();
      setTitle('');
      setSlug('');
      setSlugTouched(false);
      setDescription('');
      setPrice('0');
      setCategory('pc-build');
      setSellerType('vicitech');
      setStockStatus('ready');
      setImages([]);
      setSpecEntries([{ id: 'spec-init', key: '', value: '' }]);
      setRawSpecsText('{\n  "cpu": "",\n  "ram": ""\n}');
      setIsPreset(false);
      setPresetComponents([{ id: 'preset-init', slot: 'CPU', name: '' }]);
      setReviewedByName('');
      setReviewedByAvatar('');
      setReviewQuote('');
      setReviewVideoUrl('');
    }
  }, [open, product]);

  const handleTitleChange = (nextTitle: string) => {
    setTitle(nextTitle);
    if (!isEditing && !slugTouched) {
      setSlug(slugifyProductTitle(nextTitle));
    }
  };

  const handleSessionUploaded = (url: string) => {
    sessionUploadedUrlsRef.current.add(url);
    removedPersistedUrlsRef.current.delete(url);
  };

  const handleRemoveImage = (url: string) => {
    if (sessionUploadedUrlsRef.current.has(url)) {
      sessionUploadedUrlsRef.current.delete(url);
      void deleteProductImageFromStorage(url);
      return;
    }
    if (persistedImagesRef.current.has(url)) {
      removedPersistedUrlsRef.current.add(url);
    }
  };

  const handleCancelOrClose = useCallback(() => {
    if (isSaving || isUploading) return;
    const unsavedUploads = Array.from(sessionUploadedUrlsRef.current);
    sessionUploadedUrlsRef.current.clear();
    if (unsavedUploads.length > 0) {
      void Promise.allSettled(unsavedUploads.map((url) => deleteProductImageFromStorage(url)));
    }
    onClose();
  }, [isSaving, isUploading, onClose]);

  const toggleSpecMode = () => {
    setErrorMessage('');
    if (!isJsonMode) {
      const jsonObj = specEntriesToJson(specEntries);
      setRawSpecsText(JSON.stringify(jsonObj, null, 2));
      setIsJsonMode(true);
      return;
    }

    const parsed = parseJsonObject(rawSpecsText);
    if (!parsed.ok) {
      setErrorMessage(parsed.error);
      return;
    }
    const entries = parseProductSpecs(parsed.data);
    setSpecEntries(entries.length > 0 ? entries : [{ id: 'spec-empty', key: '', value: '' }]);
    setIsJsonMode(false);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage('');

    let resolvedSpecs: { readonly [key: string]: Json | undefined };
    if (isJsonMode) {
      const parsed = parseJsonObject(rawSpecsText);
      if (!parsed.ok) {
        setErrorMessage(parsed.error);
        return;
      }
      resolvedSpecs = parsed.data;
    } else {
      resolvedSpecs = specEntriesToJson(specEntries);
    }

    const payload: ProductFormPayload = {
      title,
      slug,
      description,
      price,
      category,
      seller_type: sellerType,
      stock_status: stockStatus,
      images,
      image_url: images[0] ?? null,
      gallery_urls: images,
      specs: resolvedSpecs,
      is_preset: isPreset,
      preset_components: presetComponents.map((row) => ({
        slot: row.slot,
        name: row.name,
      })),
      reviewed_by_name: reviewedByName,
      reviewed_by_avatar: reviewedByAvatar,
      review_quote: reviewQuote,
      review_video_url: reviewVideoUrl,
    };

    const clientCheck = validateProductPayload(payload);
    if (!clientCheck.ok) {
      setErrorMessage(clientCheck.error);
      return;
    }

    setIsSaving(true);
    try {
      const result = product
        ? await updateProductAction(product.id, payload)
        : await createProductAction(payload);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      const savedUrls = resolveProductImages(result.data);
      const removedPersisted = Array.from(removedPersistedUrlsRef.current).filter(
        (url) => !savedUrls.includes(url),
      );
      sessionUploadedUrlsRef.current.clear();
      removedPersistedUrlsRef.current.clear();

      if (removedPersisted.length > 0) {
        void Promise.allSettled(
          removedPersisted.map((url) => deleteProductImageFromStorage(url)),
        );
      }

      onSaved(result.data, product ? 'edit' : 'create');
    } catch (submitErr: unknown) {
      setErrorMessage(
        submitErr instanceof Error ? submitErr.message : 'Gagal menyimpan data produk.',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminDrawer
      open={open}
      onClose={handleCancelOrClose}
      closeDisabled={isSaving || isUploading}
      badge={isEditing ? 'Edit Produk Market' : 'Produk Market Baru'}
      title={isEditing ? product?.title || 'Edit Produk' : 'Tambah Produk / Preset'}
      subtitle={
        isEditing
          ? `Slug aktif: /market/${product?.slug ?? ''}`
          : 'Daftarkan produk siap jual atau konfigurasi preset teruji.'
      }
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            disabled={isSaving || isUploading}
            onClick={handleCancelOrClose}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-default bg-surface px-4 py-2 text-sm font-medium text-primary transition hover:bg-subtle disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            form="admin-product-editor-form"
            disabled={isSaving || isUploading}
            className="vt-btn-tactile inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-accent-cta px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-cta-hover disabled:cursor-wait disabled:opacity-55"
          >
            {isSaving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" strokeWidth={1.75} aria-hidden="true" />
            ) : (
              <Save className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
            )}
            <span>{isEditing ? 'Simpan Perubahan' : 'Terbitkan Produk'}</span>
          </button>
        </div>
      }
    >
      <form id="admin-product-editor-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
        {errorMessage ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-status-danger/30 bg-red-50 p-3 text-sm text-status-danger"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span>{errorMessage}</span>
          </p>
        ) : null}

        {/* Core Product Fields */}
        <section className="space-y-4 rounded-xl border border-default bg-surface p-4">
          <h3 className="text-sm font-semibold text-primary">Informasi Utama</h3>

          <div>
            <label htmlFor="product-title" className={labelClass}>
              Nama Produk
            </label>
            <input
              id="product-title"
              type="text"
              required
              maxLength={180}
              value={title}
              onChange={(event) => handleTitleChange(event.target.value)}
              placeholder="Preset Workstation Creator 1440p"
              className={inputClass}
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor="product-slug" className="text-xs font-semibold uppercase tracking-wider text-secondary">
                Slug URL
              </label>
              <button
                type="button"
                onClick={() => {
                  setSlug(slugifyProductTitle(title));
                  setSlugTouched(true);
                }}
                className="text-xs font-medium text-accent-hover hover:underline"
              >
                Generate dari judul
              </button>
            </div>
            <input
              id="product-slug"
              type="text"
              required
              maxLength={180}
              value={slug}
              onChange={(event) => {
                setSlug(event.target.value.toLowerCase());
                setSlugTouched(true);
              }}
              placeholder="preset-workstation-creator-1440p"
              className={`${inputClass} font-mono text-xs`}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="product-category" className={labelClass}>
                Kategori
              </label>
              <select
                id="product-category"
                value={category}
                onChange={(event) => {
                  const val = event.target.value;
                  if (isProductCategory(val)) {
                    setCategory(val);
                  }
                }}
                className={inputClass}
              >
                {PRODUCT_CATEGORIES.map((item) => (
                  <option key={item} value={item}>
                    {PRODUCT_CATEGORY_LABELS[item]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="product-price" className={labelClass}>
                Harga (IDR)
              </label>
              <input
                id="product-price"
                type="number"
                min={0}
                step={1}
                required
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className={`${inputClass} font-mono tabular-nums`}
              />
            </div>

            <div>
              <label htmlFor="product-seller-type" className={labelClass}>
                Tipe Penjual
              </label>
              <select
                id="product-seller-type"
                value={sellerType}
                onChange={(event) => {
                  const val = event.target.value;
                  if (isProductSellerType(val)) {
                    setSellerType(val);
                  }
                }}
                className={inputClass}
              >
                {PRODUCT_SELLER_TYPES.map((item) => (
                  <option key={item} value={item}>
                    {SELLER_TYPE_LABELS[item]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="product-stock-status" className={labelClass}>
                Status Stok
              </label>
              <select
                id="product-stock-status"
                value={stockStatus}
                onChange={(event) => {
                  const val = event.target.value;
                  if (isProductStockStatus(val)) {
                    setStockStatus(val);
                  }
                }}
                className={inputClass}
              >
                {PRODUCT_STOCK_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {STOCK_STATUS_LABELS[item]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="product-description" className={labelClass}>
              Deskripsi Produk
            </label>
            <textarea
              id="product-description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ringkasan performa, protokol burn-in, dan segmentasi pemakaian."
              className="w-full rounded-lg border border-default bg-surface px-3 py-2.5 text-sm text-primary outline-none transition placeholder:text-secondary/65 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
            />
          </div>
        </section>

        {/* Images Section */}
        <ProductImageUploader
          images={images}
          productSlug={slug || slugifyProductTitle(title) || 'produk'}
          isUploading={isUploading}
          onUploadingChange={setIsUploading}
          onChangeImages={setImages}
          onSessionUploaded={handleSessionUploaded}
          onRemoveImage={handleRemoveImage}
        />

        {/* Specs Section */}
        <section className="space-y-3 rounded-xl border border-default bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-primary">Spesifikasi Teknis (Specs)</h3>
              <p className="text-xs text-secondary">Disimpan sebagai objek JSONB di `products.specs`.</p>
            </div>
            <button
              type="button"
              onClick={toggleSpecMode}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-default bg-subtle px-3 py-1.5 text-xs font-medium text-primary transition hover:border-accent-primary/45 hover:bg-accent-subtle"
            >
              <Code2 className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
              <span>{isJsonMode ? 'Mode Key-Value' : 'Mode JSON Mentah'}</span>
            </button>
          </div>

          {isJsonMode ? (
            <textarea
              rows={7}
              spellCheck={false}
              value={rawSpecsText}
              onChange={(event) => setRawSpecsText(event.target.value)}
              aria-label="JSON spesifikasi produk"
              className="w-full rounded-lg border border-default bg-canvas p-3 font-mono text-xs text-primary outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
            />
          ) : (
            <div className="space-y-2">
              {specEntries.map((entry, index) => (
                <div key={entry.id} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={entry.key}
                    onChange={(event) =>
                      setSpecEntries((current) =>
                        current.map((row, rowIdx) =>
                          rowIdx === index ? { ...row, key: event.target.value } : row,
                        ),
                      )
                    }
                    placeholder="Key (mis. cpu)"
                    aria-label={`Key spesifikasi ${index + 1}`}
                    className={`${inputClass} sm:w-40 font-mono text-xs`}
                  />
                  <input
                    type="text"
                    value={entry.value}
                    onChange={(event) =>
                      setSpecEntries((current) =>
                        current.map((row, rowIdx) =>
                          rowIdx === index ? { ...row, value: event.target.value } : row,
                        ),
                      )
                    }
                    placeholder="Value (mis. AMD Ryzen 5 7600)"
                    aria-label={`Nilai spesifikasi ${index + 1}`}
                    className={`${inputClass} flex-1 text-xs`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSpecEntries((current) =>
                        current.length > 1
                          ? current.filter((_, rowIdx) => rowIdx !== index)
                          : [{ id: 'spec-reset', key: '', value: '' }],
                      )
                    }
                    aria-label={`Hapus baris spesifikasi ${index + 1}`}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-default bg-canvas text-secondary transition hover:border-status-danger/45 hover:text-status-danger"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setSpecEntries((current) => [
                    ...current,
                    { id: `spec-${Date.now()}`, key: '', value: '' },
                  ])
                }
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-default bg-canvas px-3 py-2 text-xs font-medium text-primary transition hover:border-accent-primary/45 hover:bg-accent-subtle"
              >
                <Plus className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                <span>Tambah Baris Spec</span>
              </button>
            </div>
          )}
        </section>

        {/* Preset Builder Toggle & Components */}
        <section className="space-y-3 rounded-xl border border-default bg-surface p-4">
          <ToggleSwitch
            label="Tandai sebagai Preset Rakitan Teruji"
            description="Tampilkan produk pada daftar preset siap pakai dan aktifkan rincian komponen per slot."
            checked={isPreset}
            onChange={setIsPreset}
          />

          {isPreset ? (
            <div className="space-y-2 pt-1">
              <p className="text-xs font-medium text-secondary">Daftar Komponen Preset:</p>
              {presetComponents.map((row, index) => (
                <div key={row.id} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    type="text"
                    value={row.slot}
                    onChange={(event) =>
                      setPresetComponents((current) =>
                        current.map((item, idx) =>
                          idx === index ? { ...item, slot: event.target.value } : item,
                        ),
                      )
                    }
                    placeholder="Slot (CPU, GPU, PSU)"
                    aria-label={`Slot preset ${index + 1}`}
                    className={`${inputClass} sm:w-36 text-xs`}
                  />
                  <input
                    type="text"
                    value={row.name}
                    onChange={(event) =>
                      setPresetComponents((current) =>
                        current.map((item, idx) =>
                          idx === index ? { ...item, name: event.target.value } : item,
                        ),
                      )
                    }
                    placeholder="Nama komponen"
                    aria-label={`Komponen preset ${index + 1}`}
                    className={`${inputClass} flex-1 text-xs`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setPresetComponents((current) =>
                        current.length > 1
                          ? current.filter((_, idx) => idx !== index)
                          : [{ id: 'preset-reset', slot: '', name: '' }],
                      )
                    }
                    aria-label={`Hapus komponen preset ${index + 1}`}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-default bg-canvas text-secondary transition hover:border-status-danger/45 hover:text-status-danger"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  setPresetComponents((current) => [
                    ...current,
                    { id: `preset-${Date.now()}`, slot: '', name: '' },
                  ])
                }
                className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-default bg-canvas px-3 py-2 text-xs font-medium text-primary transition hover:border-accent-primary/45 hover:bg-accent-subtle"
              >
                <Plus className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                <span>Tambah Komponen Preset</span>
              </button>
            </div>
          ) : null}
        </section>

        {/* Optional Review Metadata */}
        <section className="space-y-3 rounded-xl border border-default bg-surface p-4">
          <h3 className="text-sm font-semibold text-primary">Verdict Reviewer (Opsional)</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="product-reviewer-name" className={labelClass}>
                Nama Reviewer / Builder
              </label>
              <input
                id="product-reviewer-name"
                type="text"
                value={reviewedByName}
                onChange={(event) => setReviewedByName(event.target.value)}
                placeholder="Rizky Aditya (Verified Builder)"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="product-reviewer-video" className={labelClass}>
                URL Video Review
              </label>
              <input
                id="product-reviewer-video"
                type="url"
                value={reviewVideoUrl}
                onChange={(event) => setReviewVideoUrl(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className={`${inputClass} text-xs`}
              />
            </div>
          </div>
          <div>
            <label htmlFor="product-reviewer-avatar" className={labelClass}>
              URL Avatar Reviewer
            </label>
            <input
              id="product-reviewer-avatar"
              type="text"
              value={reviewedByAvatar}
              onChange={(event) => setReviewedByAvatar(event.target.value)}
              placeholder="/images/avatars/builder.jpg atau https://..."
              className={`${inputClass} text-xs`}
            />
          </div>
          <div>
            <label htmlFor="product-review-quote" className={labelClass}>
              Kutipan Hasil Pengujian
            </label>
            <textarea
              id="product-review-quote"
              rows={2}
              value={reviewQuote}
              onChange={(event) => setReviewQuote(event.target.value)}
              placeholder="Ringkasan temuan suhu, kebisingan, atau margin PSU."
              className="w-full rounded-lg border border-default bg-surface px-3 py-2 text-sm text-primary outline-none transition placeholder:text-secondary/65 focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20"
            />
          </div>
        </section>
      </form>
    </AdminDrawer>
  );
}

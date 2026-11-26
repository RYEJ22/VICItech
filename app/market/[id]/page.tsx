import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Activity,
  ArrowRight,
  ChevronRight,
  ExternalLink,
  FileCheck2,
  Layers,
  MessageSquare,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import type { ReactElement } from 'react';
import { SiteFooter } from '@/components/features/footer/site-footer';
import { MarketProductCard } from '@/components/features/market/market-product-card';
import { ProductGallery } from '@/components/features/market/product-gallery';
import { ProductPurchaseActions } from '@/components/features/market/product-purchase-actions';
import { RevealOnScroll } from '@/components/ui/RevealOnScroll';
import { buildSingleProductJsonLd, JsonLd } from '@/components/features/seo/json-ld';
import { isValidMediaUrl } from '@/lib/admin/products-validation';
import {
  formatIdr,
  getCategoryLabel,
  getFormattedProductMetadata,
  getFormattedProductSpecs,
  getHighlightSpecs,
  getProductHref,
  getProductPrimaryImage,
  getProductSummary,
  getProductTrustBadge,
  getProductValidImages,
  getSellerLabel,
  getStockMeta,
  parsePresetComponents,
} from '@/lib/market/product-presenter';
import {
  getMarketProductByIdentifier,
  getRecommendedMarketProducts,
} from '@/lib/market/products';

export const dynamic = 'force-dynamic';

interface ProductDetailPageProps {
  readonly params: Promise<{ readonly id: string }> | { readonly id: string };
}

export async function generateMetadata({ params }: ProductDetailPageProps): Promise<Metadata> {
  const resolvedParams = await Promise.resolve(params);

  try {
    const product = await getMarketProductByIdentifier(resolvedParams.id);
    if (!product) {
      return {
        title: 'Produk Tidak Ditemukan | Market ViciTech',
        description: 'Produk yang Anda cari tidak tersedia atau telah dipindahkan dari katalog ViciTech Market.',
      };
    }

    const summary = getProductSummary(product);
    const canonicalPath = getProductHref(product);
    const primaryImage = getProductPrimaryImage(product);
    const categoryLabel = getCategoryLabel(product.category);

    return {
      title: `${product.title} — ${categoryLabel} | ViciTech Market`,
      description: summary,
      alternates: {
        canonical: canonicalPath,
      },
      openGraph: {
        title: `${product.title} | ViciTech Market`,
        description: summary,
        url: canonicalPath,
        images: [primaryImage || '/images/hero/pc-rig.jpg'],
      },
    };
  } catch {
    return {
      title: 'Detail Produk | Market ViciTech',
      description: 'Spesifikasi lengkap, status IoT QC, dan pemesanan unit di ViciTech Market.',
    };
  }
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps): Promise<ReactElement> {
  const resolvedParams = await Promise.resolve(params);
  const product = await getMarketProductByIdentifier(resolvedParams.id);

  if (!product) {
    notFound();
  }

  const { items: recommendedProducts, hasSameCategory } = await getRecommendedMarketProducts(
    product,
    8,
  );

  const images = getProductValidImages(product);
  const stockMeta = getStockMeta(product.stock_status);
  const trustBadge = getProductTrustBadge(product);
  const formattedSpecs = getFormattedProductSpecs(product);
  const formattedMetadata = getFormattedProductMetadata(product);
  const highlightSpecs = getHighlightSpecs(product, 4);
  const presetComponents = product.is_preset
    ? parsePresetComponents(product.preset_components)
    : [];
  const summary = getProductSummary(product);
  const canonicalPath = getProductHref(product);
  const categoryLabel = getCategoryLabel(product.category);
  const sellerLabel = getSellerLabel(product.seller_type);
  const hasReviewVideo =
    typeof product.review_video_url === 'string' && isValidMediaUrl(product.review_video_url);
  const hasReviewerBlock =
    Boolean(product.reviewed_by_name) || Boolean(product.review_quote) || hasReviewVideo;

  return (
    <>
      <JsonLd data={buildSingleProductJsonLd(product)} />

      <main className="mx-auto min-h-[75vh] w-full max-w-7xl px-4 pb-24 pt-4 sm:px-6 sm:pt-8">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-secondary sm:text-sm">
            <li>
          <Link
                href="/"
            className="vt-motion-press inline-flex min-h-9 items-center rounded px-1.5 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
              >
                Beranda
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5 text-secondary" strokeWidth={1.75} />
            </li>
            <li>
              <Link
                href="/market"
                className="vt-motion-press inline-flex min-h-9 items-center rounded px-1.5 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
              >
                Market
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5 text-secondary" strokeWidth={1.75} />
            </li>
            <li>
              <Link
                href={`/market?category=${encodeURIComponent(product.category)}`}
                className="vt-motion-press inline-flex min-h-9 items-center rounded px-1.5 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
              >
                {categoryLabel}
              </Link>
            </li>
            <li aria-hidden="true">
              <ChevronRight className="h-3.5 w-3.5 text-secondary" strokeWidth={1.75} />
            </li>
            <li
              aria-current="page"
              className="max-w-[28ch] truncate px-1.5 font-medium text-primary sm:max-w-[44ch]"
            >
              {product.title}
            </li>
          </ol>
        </nav>

        {/* Above-the-Fold 2-Column Layout */}
        <RevealOnScroll
          as="section"
          ariaLabelledBy="product-title"
          className="grid gap-8 lg:grid-cols-12 lg:items-start"
        >
          <div className="lg:col-span-7">
            <ProductGallery
              title={product.title}
              category={product.category}
              images={images}
              trustBadge={trustBadge}
              isPreset={product.is_preset}
            />
          </div>

          <div className="lg:sticky lg:top-24 lg:col-span-5">
            <div className="space-y-5 rounded-xl border border-default bg-surface p-6 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Link
                    href={`/market?category=${encodeURIComponent(product.category)}`}
                    className="font-semibold uppercase tracking-wider text-accent-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
                  >
                    {categoryLabel}
                  </Link>
                  <span className="text-secondary" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-medium text-secondary">{sellerLabel}</span>
                </div>
                <span className={stockMeta.badgeClass}>{stockMeta.label}</span>
              </div>

              <div>
                <h1
                  id="product-title"
                  className="font-sans text-2xl font-bold tracking-tight text-primary [text-wrap:balance] sm:text-3xl"
                >
                  {product.title}
                </h1>
                <p className="mt-3 font-mono text-2xl font-bold tabular-nums text-primary sm:text-3xl">
                  {formatIdr(product.price)}
                </p>
              </div>

              <p className="max-w-[65ch] text-sm leading-relaxed text-secondary">{summary}</p>

              {highlightSpecs.length > 0 && (
                <dl className="grid grid-cols-2 gap-2.5">
                  {highlightSpecs.map((spec) => (
                    <div
                      key={spec.id}
                      className="rounded-lg border border-default bg-canvas px-3 py-2"
                    >
                      <dt className="truncate text-[11px] font-medium text-secondary">
                        {spec.label}
                      </dt>
                      <dd className="mt-0.5 truncate font-mono text-xs font-semibold text-primary">
                        {spec.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              <div className="border-t border-default pt-4">
                <ProductPurchaseActions product={product} canonicalPath={canonicalPath} />
              </div>
            </div>
          </div>
        </RevealOnScroll>

        {/* Below-the-Fold Technical Specs, Description & IoT QC Trust Block */}
        <div className="mt-12 grid gap-8 lg:grid-cols-12 lg:items-start">
          <div className="space-y-8 lg:col-span-8">
            {/* Spesifikasi Lengkap */}
            <section aria-labelledby="specs-heading">
              <h2
                id="specs-heading"
                className="tracking-tight font-sans text-xl font-bold text-primary sm:text-2xl"
              >
                Spesifikasi Lengkap
              </h2>
              {formattedSpecs.length > 0 ? (
                <dl className="mt-4 divide-y divide-default overflow-hidden rounded-xl border border-default bg-surface shadow-sm">
                  {formattedSpecs.map((spec) => (
                    <div
                      key={spec.id}
                      className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-5 sm:gap-4 sm:px-5"
                    >
                      <dt className="font-medium text-secondary sm:col-span-2">{spec.label}</dt>
                      <dd className="font-mono font-medium tabular-nums text-primary sm:col-span-3">
                        {spec.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <div className="mt-4 rounded-xl border border-default bg-surface p-5 text-sm text-secondary shadow-sm">
                  Rincian spesifikasi tambahan belum dicantumkan pada produk ini. Gunakan fitur
                  pesan langsung apabila Anda membutuhkan laporan inspeksi unit sebelum membeli.
                </div>
              )}
            </section>

            {/* Spesifikasi Khusus Perangkat (Metadata JSONB: Console / Handheld / Perangkat Terkurasi) */}
            {formattedMetadata.length > 0 && (
              <section aria-labelledby="device-metadata-heading">
                <h2
                  id="device-metadata-heading"
                  className="tracking-tight font-sans text-xl font-bold text-primary sm:text-2xl"
                >
                  Datasheet Perangkat &amp; Kondisi
                </h2>
                <dl className="mt-4 divide-y divide-default overflow-hidden rounded-xl border border-default bg-surface shadow-sm">
                  {formattedMetadata.map((item) => (
                    <div
                      key={item.id}
                      className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-5 sm:gap-4 sm:px-5"
                    >
                      <dt className="font-medium text-secondary sm:col-span-2">{item.label}</dt>
                      <dd className="font-mono font-medium tabular-nums text-primary sm:col-span-3">
                        {item.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            {/* Daftar Komponen Preset (bila is_preset) */}
            {presetComponents.length > 0 && (
              <section aria-labelledby="preset-components-heading">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2
                    id="preset-components-heading"
                    className="tracking-tight flex items-center gap-2 font-sans text-xl font-bold text-primary sm:text-2xl"
                  >
                    <Layers className="h-5 w-5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                    <span>Komponen dalam Preset</span>
                  </h2>
                  <Link
                    href={`/builder?productId=${encodeURIComponent(product.id)}`}
                    className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-accent-cta hover:text-accent-cta-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
                  >
                    <span>Sesuaikan di Preset Builder</span>
                    <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                  </Link>
                </div>

                <ul className="mt-4 divide-y divide-default overflow-hidden rounded-xl border border-default bg-surface shadow-sm">
                  {presetComponents.map((entry) => (
                    <li
                      key={entry.id}
                      className="grid gap-1 px-4 py-3 text-sm sm:grid-cols-5 sm:gap-4 sm:px-5"
                    >
                      <span className="font-medium text-secondary sm:col-span-2">{entry.slot}</span>
                      <span className="font-mono font-medium text-primary sm:col-span-3">
                        {entry.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Deskripsi Produk & Catatan Penguji */}
            <section
              aria-labelledby="description-heading"
              className="rounded-xl border border-default bg-surface p-6 shadow-sm"
            >
              <h2
                id="description-heading"
                className="tracking-tight font-sans text-xl font-bold text-primary sm:text-2xl"
              >
                Deskripsi Produk
              </h2>
              <p className="mt-3 max-w-[70ch] whitespace-pre-line text-sm leading-relaxed text-secondary sm:text-base">
                {product.description.trim() || summary}
              </p>

              {hasReviewerBlock && (
                <div className="mt-6 border-t border-default pt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-secondary">
                    Catatan Penguji Terverifikasi
                  </p>
                  {product.reviewed_by_name && (
                    <p className="mt-1.5 text-sm font-semibold text-primary">
                      {product.reviewed_by_name}
                    </p>
                  )}
                  {product.review_quote && (
                    <blockquote className="mt-2 max-w-[65ch] text-sm italic leading-relaxed text-secondary">
                      &ldquo;{product.review_quote}&rdquo;
                    </blockquote>
                  )}
                  {hasReviewVideo && product.review_video_url && (
                    <a
                      href={product.review_video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-subtle px-4 py-2 text-xs font-medium text-primary transition hover:border-accent-primary/50 hover:bg-accent-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                      <span>Tonton Video Uji Unit</span>
                    </a>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* Trust & Guarantee Rail */}
          <aside aria-labelledby="guarantee-heading" className="lg:col-span-4">
            <section className="rounded-xl border border-default bg-surface p-6 shadow-sm">
              <span className="inline-flex items-center rounded-md border border-default bg-subtle px-2.5 py-1 text-xs font-semibold text-primary">
                Standar Protokol ViciTech
              </span>
              <h2
                id="guarantee-heading"
                className="tracking-tight mt-3 font-sans text-xl font-bold text-primary [text-wrap:balance]"
              >
                Jaminan IoT QC &amp; Garansi ViciTech
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-secondary">
                Setiap perangkat keras dan paket rakitan melalui pemeriksaan fungsional terstruktur
                sebelum diserahkan kepada pembeli.
              </p>

              <ul className="mt-5 space-y-4">
                <li className="flex items-start gap-3">
                  <Activity
                    className="mt-0.5 h-5 w-5 shrink-0 text-status-live"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-semibold text-primary">
                      Protokol 15-Titik IoT QC &amp; Burn-In
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-secondary">
                      Pemantauan suhu beban puncak, stabilitas tegangan, dan kelayakan termal.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <ShieldCheck
                    className="mt-0.5 h-5 w-5 shrink-0 text-accent-primary"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-semibold text-primary">
                      Dukungan Mitra Servis Resmi
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-secondary">
                      Konsultasi perawatan berkala dan garansi terintegrasi di seluruh mitra kota.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <FileCheck2
                    className="mt-0.5 h-5 w-5 shrink-0 text-accent-primary"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-semibold text-primary">
                      Transparansi Nomor Seri Digital
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-secondary">
                      Lacak riwayat uji perangkat langsung melalui Panel IoT QC ViciTech.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3">
                  <RefreshCw
                    className="mt-0.5 h-5 w-5 shrink-0 text-accent-primary"
                    strokeWidth={1.75}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-semibold text-primary">Opsi Circular Trade-In</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-secondary">
                      Tukar tambah perangkat lama untuk memotong biaya upgrade unit berikutnya.
                    </p>
                  </div>
                </li>
              </ul>

              <div className="mt-6 flex flex-col gap-2 border-t border-default pt-4">
                <Link
                  href="/qc-panel"
                  className="inline-flex min-h-11 items-center justify-between rounded-lg border border-default bg-subtle px-4 py-2 text-xs font-medium text-primary transition hover:border-accent-primary/50 hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
                >
                  <span>Cek Sertifikat di Panel IoT QC</span>
                  <ArrowRight className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                </Link>
                <Link
                  href="/messages"
                  className="inline-flex min-h-11 items-center justify-between rounded-lg border border-default bg-surface px-4 py-2 text-xs font-medium text-primary transition hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
                    Tanya Teknisi via DM
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-secondary" strokeWidth={1.75} aria-hidden="true" />
                </Link>
              </div>
            </section>
          </aside>
        </div>

        {/* Recommended Products Shelf */}
        {recommendedProducts.length > 0 && (
          <section
            aria-labelledby="recommendations-heading"
            className="mt-16 border-t border-default pt-10"
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2
                  id="recommendations-heading"
                  className="font-sans text-2xl font-bold tracking-tight text-primary [text-wrap:balance] sm:text-3xl"
                >
                  {hasSameCategory ? 'Rekomendasi Produk Serupa' : 'Rekomendasi Untukmu'}
                </h2>
                <p className="mt-1.5 max-w-[65ch] text-sm text-secondary">
                  {hasSameCategory
                    ? `Pilihan ${categoryLabel} lain dan unit dengan rentang harga terdekat di ViciTech Market.`
                    : 'Unit siap kirim dan konfigurasi terbaru lain yang tersedia di ViciTech Market.'}
                </p>
              </div>

              <Link
                href="/market"
                className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-default bg-surface px-4 py-2 text-xs font-semibold text-primary transition hover:border-accent-primary/50 hover:bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/60"
              >
                <span>Lihat Semua Produk</span>
                <ArrowRight className="h-4 w-4 text-accent-primary" strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </div>

            <div className="-mx-4 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
              {recommendedProducts.map((recommendedProduct) => (
                <MarketProductCard
                  key={recommendedProduct.id}
                  product={recommendedProduct}
                  className="w-[78vw] max-w-[300px] shrink-0 snap-start sm:w-auto sm:max-w-none"
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </>
  );
}

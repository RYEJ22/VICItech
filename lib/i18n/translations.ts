import type { UserLanguage } from '@/lib/user-settings';
import type { DesktopNavUmbrellaId } from '@/components/navigation/navbar-state';

export interface NavTranslationEntry {
  readonly label: string;
  readonly description?: string;
}

export interface TranslationDictionary {
  readonly nav: {
    readonly homeAria: string;
    readonly mainNavAria: string;
    readonly groups: Readonly<Record<DesktopNavUmbrellaId, NavTranslationEntry>>;
    readonly subItems: Readonly<Record<string, NavTranslationEntry>>;
    readonly mobileBottom: Readonly<Record<string, { readonly label: string; readonly shortLabel: string }>>;
    readonly searchTitle: string;
    readonly searchAria: string;
    readonly cartTitle: string;
    readonly cartAria: (count: number) => string;
    readonly messagesAria: (unread: number) => string;
    readonly notificationsTitle: string;
    readonly notificationsAria: (unread: number) => string;
    readonly markAllRead: string;
    readonly notificationsLoginPrompt: string;
    readonly loginToAccount: string;
    readonly noNotifications: string;
    readonly openMenuAria: string;
    readonly closeMenuAria: string;
    readonly drawerSubtitle: string;
    readonly drawerSocialHeading: string;
    readonly drawerThemeHeading: string;
    readonly drawerWorkspaceHeading: string;
    readonly homeLabel: string;
    readonly homeDesc: string;
    readonly dmLabel: string;
    readonly dmDesc: string;
    readonly dmUnread: (count: number) => string;
    readonly profileLabel: string;
    readonly profileDesc: string;
    readonly settingsLabel: string;
    readonly settingsDesc: string;
  };
  readonly themeToggle: {
    readonly switchToLight: string;
    readonly switchToDark: string;
    readonly darkTitle: string;
    readonly darkSub: string;
    readonly lightTitle: string;
    readonly lightSub: string;
  };
  readonly aiWidget: {
    readonly ask: string;
    readonly close: string;
    readonly expandAria: string;
    readonly minimizeAria: string;
    readonly closeWindowAria: string;
    readonly loading: string;
  };
  readonly hero: {
    readonly eyebrow: string;
    readonly headline: string;
    readonly subheadline: string;
    readonly primaryCta: string;
    readonly secondaryCta: string;
    readonly trustAria: string;
    readonly pauseBg: string;
    readonly playBg: string;
    readonly pillars: readonly [
      { readonly title: string; readonly subtitle: string; readonly badge: string | null },
      { readonly title: string; readonly subtitle: string; readonly badge: string | null },
      { readonly title: string; readonly subtitle: string; readonly badge: string | null },
      { readonly title: string; readonly subtitle: string; readonly badge: string | null },
    ];
  };
  readonly bento: {
    readonly eyebrow: string;
    readonly headline: string;
    readonly subtitle: string;
    readonly p1Badge: string;
    readonly p1Meta: string;
    readonly p1Title: string;
    readonly p1Desc: string;
    readonly p1PreviewTitle: string;
    readonly p1PreviewStatus: string;
    readonly p1PsuLabel: string;
    readonly p1FpsLabel: string;
    readonly p1JitLabel: string;
    readonly p1JitValue: string;
    readonly p1CtaBuilder: string;
    readonly p1CtaBottleneck: string;
    readonly p1CtaUpgrade: string;
    readonly p1CtaAi: string;
    readonly p2Badge: string;
    readonly p2Title: string;
    readonly p2Desc: string;
    readonly p2DemoTag: string;
    readonly p2BurnInLabel: string;
    readonly p2BurnInValue: string;
    readonly p2SanitationLabel: string;
    readonly p2SanitationValue: string;
    readonly p2Cta: string;
    readonly p3Badge: string;
    readonly p3Meta: string;
    readonly p3Title: string;
    readonly p3Desc: string;
    readonly p3CtaCommunity: string;
    readonly p3CtaMessages: string;
    readonly p4Badge: string;
    readonly p4Title: string;
    readonly p4Desc: string;
    readonly p4CtaMarket: string;
    readonly p4CtaTradeIn: string;
  };
  readonly showcase: {
    readonly sectionAria: string;
    readonly manifestoBadge: string;
    readonly manifestoHeadline: string;
    readonly manifestoPrimaryCta: string;
    readonly manifestoSecondaryCta: string;
    readonly diagramBadge: string;
    readonly diagramHeadline: string;
    readonly callouts: Readonly<Record<string, { readonly badgeLabel: string; readonly title: string; readonly summary: string }>>;
    readonly workflowBadge: string;
    readonly workflowHeadline: string;
    readonly steps: Readonly<
      Record<
        string,
        {
          readonly phaseLabel: string;
          readonly title: string;
          readonly summary: string;
          readonly deliverables: readonly [string, string];
          readonly actionLabel: string;
        }
      >
    >;
    readonly pillarsBadge: string;
    readonly pillarsHeadline: string;
    readonly pillarsCta: string;
    readonly pillars: Readonly<
      Record<
        string,
        {
          readonly title: string;
          readonly description: string;
          readonly tags: readonly [string, string, string];
          readonly badgeLabel: string;
          readonly actionLabel: string;
        }
      >
    >;
    readonly closingHeadline: string;
    readonly closingDesc: string;
    readonly closingPrimaryCta: string;
    readonly closingSecondaryCta: string;
  };
  readonly footer: {
    readonly description: string;
    readonly badgeRef: string;
    readonly ecosystemHeading: string;
    readonly verificationHeading: string;
    readonly checkSerialCta: string;
    readonly standards: readonly string[];
    readonly links: Readonly<Record<string, string>>;
    readonly copyright: (year: number) => string;
    readonly disclaimer: string;
    readonly settings: string;
    readonly feedback: string;
    readonly cookies: string;
  };
  readonly settings: {
    readonly pageEyebrow: string;
    readonly pageTitle: string;
    readonly pageDesc: string;
    readonly presetsTitle: string;
    readonly presetsDesc: string;
    readonly presetActive: string;
    readonly presetCustom: string;
    readonly presetBalancedTitle: string;
    readonly presetBalancedDesc: string;
    readonly presetReadabilityTitle: string;
    readonly presetReadabilityDesc: string;
    readonly presetObsidianTitle: string;
    readonly presetObsidianDesc: string;
    readonly resetBtn: string;
    readonly resetConfirmPrompt: string;
    readonly resetConfirmAction: string;
    readonly resetCancelAction: string;
    readonly resetDoneNotice: string;
    readonly displayTitle: string;
    readonly displayDesc: string;
    readonly syncSaving: string;
    readonly syncSaved: string;
    readonly syncActive: string;
    readonly syncLocal: string;
    readonly themeTitle: string;
    readonly themeDescPrefix: string;
    readonly themeDescHighlight: string;
    readonly themeDescSuffix: string;
    readonly themeLightLabel: string;
    readonly themeLightSub: string;
    readonly themeDarkLabel: string;
    readonly themeDarkSub: string;
    readonly pixelIntensityTitle: string;
    readonly pixelIntensityDesc: string;
    readonly pixelStandardLabel: string;
    readonly pixelStandardSub: string;
    readonly pixelSubtleLabel: string;
    readonly pixelSubtleSub: string;
    readonly contrastTitle: string;
    readonly contrastDesc: string;
    readonly contrastAria: string;
    readonly textScaleTitle: string;
    readonly textScaleDesc: string;
    readonly scaleNormal: string;
    readonly scaleLarge: string;
    readonly scaleXLarge: string;
    readonly motionTitle: string;
    readonly motionDescPrefix: string;
    readonly motionReduced: string;
    readonly motionStandard: string;
    readonly motionAria: string;
    readonly telemetrySectionTitle: string;
    readonly telemetrySectionDesc: string;
    readonly langTitle: string;
    readonly langDesc: string;
    readonly langIdSub: string;
    readonly langEnSub: string;
    readonly tempUnitTitle: string;
    readonly tempUnitDesc: string;
    readonly tempCelsiusLabel: string;
    readonly tempFahrenheitLabel: string;
    readonly compactNumbersTitle: string;
    readonly compactNumbersDesc: string;
    readonly compactNumbersAria: string;
    readonly sourceBadgesTitle: string;
    readonly sourceBadgesDesc: string;
    readonly sourceBadgesAria: string;
    readonly readoutPreviewTitle: string;
    readonly readoutPreviewTemp: string;
    readonly readoutPreviewFan: string;
    readonly readoutPreviewPrice: string;
    readonly readoutPreviewBadgesMinimal: string;
    readonly navSectionTitle: string;
    readonly navSectionDesc: string;
    readonly navScrollTitle: string;
    readonly navScrollDesc: string;
    readonly navScrollCollapseLabel: string;
    readonly navScrollCollapseSub: string;
    readonly navScrollKeepLabel: string;
    readonly navScrollKeepSub: string;
    readonly mobileDensityTitle: string;
    readonly mobileDensityDesc: string;
    readonly mobileDensityComfortableLabel: string;
    readonly mobileDensityComfortableSub: string;
    readonly mobileDensityCompactLabel: string;
    readonly mobileDensityCompactSub: string;
    readonly touchTargetNote: string;
    readonly privacyTitle: string;
    readonly privacyDesc: string;
    readonly cookieCardTitle: string;
    readonly cookieCardDesc: string;
    readonly cookieCardBtn: string;
    readonly exportCardTitle: string;
    readonly exportCardDesc: string;
    readonly exportBtn: string;
    readonly exportPreparing: string;
    readonly exportLoginBtn: string;
    readonly deleteCardTitle: string;
    readonly deleteCardDesc: string;
    readonly deleteBtn: string;
    readonly deleteLoginBtn: string;
    readonly deleteModalTitle: string;
    readonly deleteModalSub: string;
    readonly deleteCancel: string;
    readonly deleteSubmit: string;
    readonly deleteSending: string;
  };
  readonly routes: {
    readonly market: {
      readonly badge: string;
      readonly titleReady: string;
      readonly titleLibrary: string;
      readonly tabReady: string;
      readonly tabLibrary: string;
      readonly bannerSummary: string;
      readonly searchPlaceholder: string;
      readonly stockAll: string;
      readonly stockReady: string;
      readonly stockPreorder: string;
      readonly qcToggle: string;
      readonly sortLabel: string;
      readonly sortNewest: string;
      readonly sortPriceAsc: string;
      readonly sortPriceDesc: string;
      readonly categoryAll: string;
      readonly categoryCameraProduction: string;
      readonly cameraFilterHeading: string;
      readonly cameraFilterDesc: string;
      readonly cameraSampleNotice: string;
      readonly cameraSubtypeAll: string;
      readonly showingPrefix: string;
      readonly showingUnit: string;
      readonly reset: string;
      readonly datasheetBtn: string;
      readonly datasheetTitle: string;
      readonly datasheetSpecsHeading: string;
      readonly datasheetQcHeading: string;
      readonly datasheetOpenDetail: string;
      readonly datasheetCloseAria: string;
    };
    readonly builder: {
      readonly badge: string;
      readonly eyebrow: string;
      readonly title: string;
      readonly desc: string;
      readonly budgetHeading: string;
    };
    readonly bottleneck: {
      readonly badge: string;
      readonly eyebrow: string;
      readonly title: string;
      readonly desc: string;
      readonly meterTitlePrefix: string;
      readonly gaugeCaption: string;
      readonly statusOptimal: string;
      readonly statusWarning: string;
      readonly statusHigh: string;
      readonly legendOptimal: string;
      readonly legendWarning: string;
      readonly legendHigh: string;
      readonly directionBalanced: string;
      readonly directionCpuMild: string;
      readonly directionCpuSevere: string;
      readonly directionGpuMild: string;
      readonly directionGpuSevere: string;
      readonly cpuUtilization: string;
      readonly gpuUtilization: string;
      readonly primaryLimiter: string;
      readonly askAiCta: string;
      readonly shareCardCta: string;
      readonly preparingCard: string;
      readonly closeShareNoticeAria: string;
      readonly scenarioLabels: Readonly<Record<string, string>>;
      readonly projectedLabels: Readonly<Record<string, { readonly label: string; readonly unit: string }>>;
      readonly psuTitle: string;
      readonly psuStatusSafe: string;
      readonly psuStatusTight: string;
      readonly psuStatusInsufficient: string;
      readonly psuStatusUnspecified: string;
      readonly psuEstLoad: string;
      readonly psuRecommended: string;
      readonly psuLoadOnPrefix: string;
      readonly psuNoneSelected: string;
      readonly psuMeterAria: string;
      readonly psuHintSafe: string;
      readonly psuHintIdeal: string;
      readonly psuHintCritical: string;
      readonly compatTitle: string;
      readonly compatSocketLabel: string;
      readonly compatMemoryLabel: string;
      readonly compatRamCapPrefix: string;
      readonly compatPsuLabel: string;
    };
    readonly versus: {
      readonly badge: string;
      readonly eyebrow: string;
      readonly title: string;
      readonly desc: string;
    };
    readonly upgrade: {
      readonly badge: string;
      readonly eyebrow: string;
      readonly title: string;
      readonly desc: string;
    };
    readonly tradeIn: {
      readonly badge: string;
      readonly eyebrow: string;
      readonly title: string;
      readonly desc: string;
      readonly step1Label: string;
      readonly step1Title: string;
    };
    readonly qcPanel: {
      readonly eyebrow: string;
      readonly title: string;
      readonly desc: string;
      readonly waitingBadge: string;
      readonly statEngineLabel: string;
      readonly statEngineValue: string;
      readonly statStorageLabel: string;
      readonly statStorageValue: string;
      readonly statModeLabel: string;
      readonly statModeValue: string;
    };
    readonly partners: {
      readonly verifiedBadge: (count: number) => string;
      readonly fallbackBadge: string;
      readonly qcBtn: string;
      readonly title: string;
      readonly desc: string;
      readonly dmCta: string;
      readonly tradeInCta: string;
      readonly shareLabel: string;
    };
    readonly community: {
      readonly liveBadge: string;
      readonly sampleBadge: string;
      readonly eyebrow: string;
      readonly title: string;
      readonly desc: string;
      readonly createPostBtn: string;
      readonly categories: Readonly<Record<string, string>>;
      readonly roles: Readonly<Record<string, string>>;
      readonly composerTitle: string;
      readonly composerTitleLabel: string;
      readonly composerTitlePlaceholder: string;
      readonly composerCategoryLabel: string;
      readonly composerDetailLabel: string;
      readonly composerPrompts: Readonly<Record<string, string>>;
      readonly composerTagsDetected: string;
      readonly composerMediaBtn: string;
      readonly composerAttachSpecs: string;
      readonly composerAttachedSpecs: string;
      readonly composerSpecSampleTitle: string;
      readonly composerPublishBtn: string;
      readonly composerUploading: string;
      readonly composerSaving: string;
      readonly composerAttachmentHint: string;
      readonly composerPublishedNotice: string;
      readonly composerTitleMinError: string;
      readonly composerBodyMinError: string;
      readonly searchTabPosts: string;
      readonly searchTabUsers: string;
      readonly searchHintPosts: string;
      readonly searchHintUsers: string;
      readonly searchPlaceholderPosts: string;
      readonly searchPlaceholderUsers: string;
      readonly searchClearAria: string;
      readonly searchingUsers: string;
      readonly backToPosts: string;
      readonly usersNotFoundTitle: string;
      readonly authorFilterPrefix: string;
      readonly showAllBtn: string;
      readonly showingPrefix: string;
      readonly showingUnit: string;
      readonly loadMoreBtn: string;
      readonly emptyTitle: string;
      readonly emptyDesc: string;
      readonly resetFilterBtn: string;
      readonly commentsLabel: string;
      readonly shareBtn: string;
      readonly shareSpecsBtn: string;
      readonly reportBtn: string;
      readonly reportPrompt: string;
      readonly noComments: string;
      readonly replyPlaceholder: string;
      readonly replySendAria: string;
      readonly specsHeader: string;
      readonly specsTotalLabel: string;
      readonly memberViewPosts: string;
      readonly memberProfile: string;
      readonly memberSendDm: string;
      readonly sidebarContributors: string;
      readonly sidebarLikesUnit: string;
      readonly sidebarPostsUnit: string;
      readonly sidebarNoContributors: string;
      readonly sidebarGuides: string;
      readonly sidebarTopTags: string;
      readonly sidebarNoTags: string;
    };
    readonly aiConsultant: {
      readonly eyebrow: string;
      readonly title: string;
      readonly desc: string;
      readonly disclaimer: string;
    };
    readonly feedback: {
      readonly eyebrow: string;
      readonly title: string;
      readonly desc: string;
      readonly howProcessedTitle: string;
      readonly privacyCardTitle: string;
      readonly privacyCardCta: string;
    };
    readonly cookies: {
      readonly eyebrow: string;
      readonly title: string;
      readonly desc: string;
      readonly dataRequestCta: string;
    };
  };
}

export const TRANSLATIONS: Readonly<Record<UserLanguage, TranslationDictionary>> = {
  id: {
    nav: {
      homeAria: 'ViciTech Beranda',
      mainNavAria: 'Navigasi utama ViciTech',
      groups: {
        market: { label: 'Market' },
        toolkit: { label: 'Toolkit' },
        services: { label: 'Layanan & QC' },
        community: {
          label: 'Komunitas',
          description: 'Showcase rakitan, panduan teknis & tanya jawab komunitas.',
        },
      },
      subItems: {
        'market-ready': {
          label: 'Etalase Market',
          description: 'PC rakitan siap kirim & unit laptop lulus uji IoT QC.',
        },
        'market-catalog': {
          label: 'Hardware Library',
          description: 'Katalog spesifikasi CPU, GPU, laptop & komponen lengkap.',
        },
        'toolkit-builder': {
          label: 'Preset Builder',
          description: 'Rakit PC otomatis dengan cek kompatibilitas soket & TDP.',
        },
        'toolkit-bottleneck': {
          label: 'Bottleneck Analyzer',
          description: 'Hitung keseimbangan performa CPU & GPU.',
        },
        'toolkit-versus': {
          label: 'Versus Arena',
          description: 'Bandingkan spesifikasi hardware head-to-head.',
        },
        'toolkit-upgrade': {
          label: 'Upgrade Analyzer',
          description: 'Cek potensi ekspansi RAM & storage perangkatmu.',
        },
        'toolkit-ai-consultant': {
          label: 'Konsultan Rakitan AI',
          description: 'Konsultasi rakitan PC, upgrade laptop, dan katalog ViciTech.',
        },
        'service-qc': {
          label: 'Panel IoT QC',
          description: 'Lacak status perakitan & telemetri burn-in ESP32.',
        },
        'service-tradein': {
          label: 'Trade-In & Refurbished',
          description: 'Tukar tambah perangkat lama & unit bekas terverifikasi.',
        },
        'service-partners': {
          label: 'Mitra & Service',
          description: 'Cari toko komponen & service center lokal tepercaya.',
        },
      },
      mobileBottom: {
        home: { label: 'Beranda', shortLabel: 'Beranda' },
        market: { label: 'Market', shortLabel: 'Market' },
        builder: { label: 'Toolkit', shortLabel: 'Toolkit' },
        tradein: { label: 'Layanan & QC', shortLabel: 'Layanan' },
        community: { label: 'Komunitas', shortLabel: 'Komunitas' },
      },
      searchTitle: 'Cari cepat (Ctrl+K)',
      searchAria: 'Cari di ViciTech (Ctrl+K)',
      cartTitle: 'Keranjang Belanja',
      cartAria: (count) => (count > 0 ? `Keranjang Belanja (${count} item)` : 'Keranjang Belanja'),
      messagesAria: (unread) => (unread > 0 ? `Pesan Langsung (${unread} belum dibaca)` : 'Pesan Langsung'),
      notificationsTitle: 'Notifikasi',
      notificationsAria: (unread) => (unread > 0 ? `Notifikasi (${unread} belum dibaca)` : 'Notifikasi'),
      markAllRead: 'Tandai dibaca',
      notificationsLoginPrompt: 'Masuk untuk melihat notifikasi pesanan, komentar, dan pesan langsung Anda.',
      loginToAccount: 'Masuk ke Akun',
      noNotifications: 'Belum ada notifikasi baru.',
      openMenuAria: 'Buka menu navigasi ViciTech',
      closeMenuAria: 'Tutup menu navigasi',
      drawerSubtitle: 'Ekosistem Circular IT & Hardware QC',
      drawerSocialHeading: 'Sosial & Panduan',
      drawerThemeHeading: 'Tema Tampilan',
      drawerWorkspaceHeading: 'Workspace & Akun',
      homeLabel: 'Beranda',
      homeDesc: 'Halaman utama ekosistem Circular IT & Hardware QC ViciTech.',
      dmLabel: 'Pesan Langsung',
      dmDesc: 'Obrolan langsung dengan teknisi & builder.',
      dmUnread: (count) => `${count} pesan belum dibaca`,
      profileLabel: 'Profil & Akun',
      profileDesc: 'Pesanan, preset tersimpan & preferensi akun.',
      settingsLabel: 'Pengaturan & Privasi',
      settingsDesc: 'Bahasa, tema, aksesibilitas tampilan, ekspor data & kontrol UU PDP.',
    },
    themeToggle: {
      switchToLight: 'Ganti ke Mode Terang',
      switchToDark: 'Aktifkan Mode Gelap (Obsidian Ruby Pixel)',
      darkTitle: 'Mode Gelap · Obsidian Ruby Pixel',
      darkSub: 'Ketuk untuk kembali ke tema terang',
      lightTitle: 'Mode Terang · Standar',
      lightSub: 'Ketuk untuk UI Obsidian Ruby Pixel',
    },
    aiWidget: {
      ask: 'Tanya ViciTech AI',
      close: 'Tutup ViciTech AI',
      expandAria: 'Perluas chat ke layar penuh',
      minimizeAria: 'Minimalkan jendela chat',
      closeWindowAria: 'Tutup jendela chat',
      loading: 'Menyiapkan konsultan…',
    },
    hero: {
      eyebrow: 'Ekosistem Circular IT & Hardware Toolkit Indonesia',
      headline: 'Beli, rakit, dan upgrade PC & laptop tanpa rasa ragu.',
      subheadline:
        'Dari simulasi rakitan & bottleneck, verifikasi 15 titik Hybrid IoT QC (Simulated / Demo), hingga konsultasi ViciTech AI langsung ke katalog — semua dalam satu platform transparan.',
      primaryCta: 'Jelajahi Market QC',
      secondaryCta: 'Mulai Rakit PC',
      trustAria: 'Keunggulan utama ViciTech',
      pauseBg: 'Jeda animasi latar',
      playBg: 'Putar animasi latar',
      pillars: [
        { title: '15 Titik Hybrid IoT QC', subtitle: 'Mode Simulated / Demo', badge: 'Simulated' },
        { title: 'Sanitasi Data NIST SP 800-88', subtitle: 'Standar hapus data aman', badge: null },
        { title: 'ViciTech AI Katalog Langsung', subtitle: 'Rekomendasi spek & harga', badge: null },
        { title: 'Gratis Tanpa Login', subtitle: 'Coba semua toolkit seketika', badge: null },
      ],
    },
    bento: {
      eyebrow: 'Tri-Pillar Moat ViciTech',
      headline: 'Tiga pilar yang bikin keputusan hardware Anda lebih presisi dan aman.',
      subtitle:
        'Satukan kalkulator simulasi, verifikasi kualitas transparan, dan komunitas teknis aktif sebelum mengeluarkan anggaran sepeser pun.',
      p1Badge: 'Pilar 1 · Toolkit Simulasi',
      p1Meta: 'Gratis · Tanpa Login',
      p1Title: 'Simulasi rakitan, bottleneck, dan upgrade sebelum beli komponen.',
      p1Desc:
        'Cek kecocokan soket & DDR, hitung headroom daya PSU +35%, proyeksi FPS per game, hingga potensi ekspansi RAM/SSD laptop Anda dengan bantuan ViciTech AI.',
      p1PreviewTitle: 'Contoh Simulasi · Ryzen 5 7600 + RTX 4060',
      p1PreviewStatus: 'Seimbang (4.2%)',
      p1PsuLabel: 'Beban PSU',
      p1FpsLabel: '1080p Kompetitif',
      p1JitLabel: 'Buffer JIT',
      p1JitValue: '5% Dinamis',
      p1CtaBuilder: 'Preset Builder',
      p1CtaBottleneck: 'Bottleneck',
      p1CtaUpgrade: 'Upgrade Analyzer',
      p1CtaAi: 'Konsultan AI',
      p2Badge: 'Pilar 2 · Hybrid IoT QC',
      p2Title: 'Verifikasi 15 titik & sertifikat serial anti-zonk.',
      p2Desc:
        'Transparansi log uji termal, voltase, dan sanitasi data NIST SP 800-88 yang dapat dicek publik lewat nomor seri. Integrasi sensor fisik ESP32 dijadwalkan di v2.5.',
      p2DemoTag: 'Profil Demo QC',
      p2BurnInLabel: 'Burn-In Termal CPU/GPU',
      p2BurnInValue: '64.0°C · Stabil',
      p2SanitationLabel: 'Sanitasi NIST SP 800-88',
      p2SanitationValue: '15/15 Lulus',
      p2Cta: 'Buka Panel Simulasi IoT QC',
      p3Badge: 'Pilar 3 · Community Hub',
      p3Meta: 'Diskusi & DM Langsung',
      p3Title: 'Belajar dari rakitan nyata, cari anggota, dan diskusi langsung.',
      p3Desc:
        'Bagikan hasil rakitan PC, tanyakan pengalaman upgrade laptop, atau kirim pesan langsung ke builder dan teknisi terpercaya di komunitas ViciTech.',
      p3CtaCommunity: 'Jelajahi Komunitas',
      p3CtaMessages: 'Pesan Langsung',
      p4Badge: 'Market & Circular Trade-In',
      p4Title: 'PC, Laptop, Consoles & Handhelds dalam satu etalase.',
      p4Desc:
        'Beli unit siap kirim dengan Smart Part Matcher atau tukar tambah perangkat lama Anda secara transparan.',
      p4CtaMarket: 'Buka Market',
      p4CtaTradeIn: 'Trade-In',
    },
    showcase: {
      sectionAria: 'Ringkasan arsitektur Circular IT ViciTech',
      manifestoBadge: 'Ekosistem Circular IT ViciTech',
      manifestoHeadline:
        'Kami menghadirkan transparansi perangkat keras presisi untuk builder, gamer, sekolah, dan armada bisnis.',
      manifestoPrimaryCta: 'Mulai Rakit di Workspace',
      manifestoSecondaryCta: 'Jelajahi Market',
      diagramBadge: 'Protokol Verifikasi Multi-Perangkat · Demo QC',
      diagramHeadline: 'Empat pilar pengujian dan jaminan di setiap unit ViciTech.',
      callouts: {
        'callout-esp32': {
          badgeLabel: 'Simulated / Demo',
          title: 'Protokol QC 15 Titik & Telemetri Burn-In',
          summary:
            'Simulasi profil uji suhu CPU/GPU, stabilitas voltase, dan sertifikat serial (integrasi sensor fisik ESP32 dijadwalkan di v2.5).',
        },
        'callout-nist': {
          badgeLabel: 'Simulated / Demo',
          title: 'Sanitasi Data Standar NIST 800-88',
          summary: 'Penghapusan data permanen untuk unit enterprise B2B, sekolah B2S, dan unit Trade-In.',
        },
        'callout-jit': {
          badgeLabel: 'Sample',
          title: 'Buffer Pengadaan JIT 5% (B2S & B2B)',
          summary: 'Kalkulasi stok cadangan dan daya listrik otomatis agar pengadaan lab tetap bebas kendala.',
        },
        'callout-tradein': {
          badgeLabel: 'Sample',
          title: 'Valuasi Trade-In & Refurbished Grade A+',
          summary: 'Ubah perangkat lama menjadi kredit upgrade ke laptop bisnis atau komponen tersertifikasi.',
        },
      },
      workflowBadge: 'Alur Kerja Terpadu',
      workflowHeadline: 'Setiap perangkat melalui siklus riset hingga verifikasi yang rapi.',
      steps: {
        'step-riset': {
          phaseLabel: 'Tahap Riset',
          title: 'Analisis Spek & Potensi Upgrade',
          summary:
            'Bandingkan ponsel, laptop, desktop, dan aksesori secara berdampingan sekaligus cek jumlah slot RAM dan NVMe maksimum.',
          deliverables: ['Komparasi hingga 4 perangkat', 'Cek kapasitas ekspansi slot'],
          actionLabel: 'Buka Hardware Library',
        },
        'step-konfigurasi': {
          phaseLabel: 'Tahap Konfigurasi',
          title: 'Rakit Preset & Simulasi Bottleneck',
          summary:
            'Susun paket PC B2C, workstation kantor B2B, atau pengadaan lab CBT sekolah B2S dengan hitung TDP PSU dan bottleneck CPU/GPU.',
          deliverables: ['Estimasi beban daya & FPS', 'Buffer pengadaan JIT 5%'],
          actionLabel: 'Susun di Preset Builder',
        },
        'step-verifikasi': {
          phaseLabel: 'Tahap Verifikasi QC',
          title: 'Uji Burn-In & Sertifikasi Telemetri',
          summary:
            'Setiap perangkat yang dirakit atau direkondisi melewati 15 titik pengecekan dan terikat kode serial VICI-XXX untuk verifikasi publik.',
          deliverables: ['Log telemetri suhu & voltase', 'Sertifikat digital anti-zonk'],
          actionLabel: 'Cek Serial IoT QC',
        },
        'step-sirkular': {
          phaseLabel: 'Tahap Ekosistem',
          title: 'Trade-In Sirkular & Mitra Servis',
          summary:
            'Tukar tambah aset lama secara satuan maupun massal dan temukan pusat servis atau toko komponen terpercaya di jaringan mitra.',
          deliverables: ['Estimasi valuasi tukar tambah', 'Terhubung ke DM & teknisi mitra'],
          actionLabel: 'Buka Portal Trade-In',
        },
      },
      pillarsBadge: 'Direktori Pilar ViciTech',
      pillarsHeadline: 'Setiap komponen dan perangkat punya jejak verifikasi yang transparan.',
      pillarsCta: 'Lihat Etalase Market',
      pillars: {
        'pillar-library': {
          title: 'Hardware Library & Upgrade',
          description:
            'Katalog terpadu untuk membandingkan smartphone, laptop bisnis, GPU/CPU desktop, dan memeriksa batas upgrade RAM/NVMe.',
          tags: ['4 Kategori Utama', 'Kalkulator Ekspansi', 'Perbandingan Spek'],
          badgeLabel: 'Sample Catalog',
          actionLabel: 'Buka Library',
        },
        'pillar-qc': {
          title: 'IoT Smart Bench & QC Engine',
          description:
            'Pelacakan nomor serial dengan profil uji simulasi admin (Simulated / Demo) yang dipisahkan secara tegas dari sensor ESP32 fisik.',
          tags: ['15-Point Protocol', 'NIST 800-88 Wipe', 'QR Verification'],
          badgeLabel: 'Simulated / Demo',
          actionLabel: 'Lacak QC Serial',
        },
        'pillar-market': {
          title: 'Curated Market & Presets',
          description:
            'Etalase rakitan siap pakai untuk gaming, kreator, kantor, dan lab sekolah dengan validasi kompatibilitas menyeluruh.',
          tags: ['Preset B2C / B2B / B2S', 'JIT 5% Buffer', 'Creator Verdict'],
          badgeLabel: 'Sample Preview',
          actionLabel: 'Lihat Market',
        },
        'pillar-partners': {
          title: 'Service Center & Mitra Lokal',
          description:
            'Jaringan teknisi perbaikan laptop/PC dan mitra komponen terverifikasi untuk konsultasi langsung serta inspeksi Trade-In.',
          tags: ['Hub Bandung & Jaksel', 'Support Lab B2S', 'Konsultasi DM'],
          badgeLabel: 'Sample Mitra',
          actionLabel: 'Direktori Mitra',
        },
      },
      closingHeadline: 'Rakit, diagnosa, dan kelola siklus hidup perangkat keras Anda.',
      closingDesc:
        'Dari rakitan PC kustom dan laptop enterprise hingga smartphone dan aksesori, semua terhubung dalam satu ekosistem transparan.',
      closingPrimaryCta: 'Buka Community Hub',
      closingSecondaryCta: 'Cari Mitra Servis',
    },
    footer: {
      description:
        'Ekosistem Circular IT untuk riset spesifikasi perangkat keras, rakitan B2S/B2B/B2C terkurasi, tukar tambah aset, dan verifikasi kualitas berbasis telemetri ESP32.',
      badgeRef: 'Spesifikasi Referensi',
      ecosystemHeading: 'Ekosistem',
      verificationHeading: 'Verifikasi & Standar',
      checkSerialCta: 'Cek Nomor Seri IoT QC',
      standards: [
        'Sanitasi Data NIST 800-88',
        'Protokol 15-Titik IoT QC',
        'Kebijakan JIT Dynamic Buffer 5%',
        'Sertifikasi Refurbished Grade A+',
      ],
      links: {
        '/': 'Beranda',
        '/market': 'Market & Hardware Library',
        '/builder': 'Smart Preset Builder',
        '/trade-in': 'Circular Trade-In',
        '/partners': 'Mitra & Service',
        '/community': 'Komunitas',
        '/feedback': 'Umpan Balik & Validasi',
      },
      copyright: (year) => `© ${year} ViciTech. Seluruh hak cipta dilindungi.`,
      disclaimer:
        'Harga katalog sebagai referensi; data telemetri sensor & profil simulasi dipisahkan eksplisit.',
      settings: 'Pengaturan',
      feedback: 'Umpan Balik',
      cookies: 'Kebijakan Cookie & Privasi',
    },
    settings: {
      pageEyebrow: 'Pusat Pengaturan ViciTech OS',
      pageTitle: 'Pengaturan, Kenyamanan & Privasi',
      pageDesc:
        'Sesuaikan tampilan, intensitas Pixel UX, bahasa, format pembacaan telemetri, kenyamanan navigasi mobile, serta hak privasi Anda dalam satu tempat.',
      presetsTitle: 'Preset Kenyamanan Cepat',
      presetsDesc:
        'Terapkan kombinasi tampilan, keterbacaan, dan navigasi dalam satu klik—bahasa aktif dan status privasi Anda tetap terjaga.',
      presetActive: 'Aktif',
      presetCustom: 'Kustom',
      presetBalancedTitle: 'Default Seimbang',
      presetBalancedDesc: 'Mode Terang standar, ukuran teks 100%, navbar ringkas saat gulir.',
      presetReadabilityTitle: 'Keterbacaan Tinggi',
      presetReadabilityDesc: 'Kontras tinggi, teks 112.5%, aksen pixel halus, label navbar selalu tampil.',
      presetObsidianTitle: 'Obsidian Pixel',
      presetObsidianDesc: 'Mode Gelap Obsidian Ruby Pixel penuh dengan kepadatan mobile ringkas.',
      resetBtn: 'Reset Default',
      resetConfirmPrompt:
        'Kembalikan semua preferensi tampilan, telemetri, dan navigasi ke pengaturan bawaan? Permintaan privasi akun tidak terhapus.',
      resetConfirmAction: 'Ya, Reset Default',
      resetCancelAction: 'Batal',
      resetDoneNotice: 'Semua preferensi tampilan, telemetri, dan navigasi telah dikembalikan ke bawaan.',
      displayTitle: 'Tampilan & Pixel UX',
      displayDesc:
        'Preferensi diterapkan instan di perangkat ini dan otomatis tersinkron ke profil saat Anda masuk.',
      syncSaving: 'Menyimpan…',
      syncSaved: 'Tersinkron ke akun',
      syncActive: 'Sinkronisasi akun aktif',
      syncLocal: 'Tersimpan di perangkat',
      themeTitle: 'Tema Tampilan',
      themeDescPrefix: 'Pilih Mode Terang bersih sebagai standar, atau aktifkan Mode Gelap dengan estetika ',
      themeDescHighlight: 'Obsidian Ruby Pixel UI',
      themeDescSuffix: ' (tipografi sans-serif & angka tabular tetap tajam).',
      themeLightLabel: 'Mode Terang',
      themeLightSub: 'Default · Tech Orange',
      themeDarkLabel: 'Mode Gelap',
      themeDarkSub: 'Obsidian Ruby Pixel',
      pixelIntensityTitle: 'Intensitas Aksen Pixel UI',
      pixelIntensityDesc:
        'Pilih gaya Pixel standar (bayangan tegas, grid obsidian, tag Silkscreen) atau Halus untuk sudut lebih lembut dan tampilan lebih tenang.',
      pixelStandardLabel: 'Standar',
      pixelStandardSub: 'Gaya Pixel penuh',
      pixelSubtleLabel: 'Halus',
      pixelSubtleSub: 'Minimal & tenang',
      contrastTitle: 'Mode Kontras Tinggi',
      contrastDesc:
        'Mempertegas batas kartu, kontras teks, dan indikator fokus papan ketik untuk keterbacaan maksimal di tema terang maupun gelap.',
      contrastAria: 'Aktifkan Mode Kontras Tinggi',
      textScaleTitle: 'Skala Ukuran Teks',
      textScaleDesc:
        'Sesuaikan ukuran dasar tipografi agar lebih nyaman dibaca tanpa merusak tata letak halaman.',
      scaleNormal: 'Normal',
      scaleLarge: 'Besar',
      scaleXLarge: 'Ekstra Besar',
      motionTitle: 'Kurangi Gerakan (Reduced Motion)',
      motionDescPrefix: 'Menonaktifkan animasi transisi dan efek gerak antarmuka. Status sistem perangkat Anda saat ini: ',
      motionReduced: 'Aktif (Reduced)',
      motionStandard: 'Standar',
      motionAria: 'Aktifkan Kurangi Gerakan',
      telemetrySectionTitle: 'Bahasa & Pembacaan Telemetri',
      telemetrySectionDesc:
        'Sinkronkan bahasa antarmuka di seluruh rute sekaligus atur format angka, satuan suhu sensor IoT QC, dan tampilan badge sumber data.',
      langTitle: 'Bahasa Antarmuka',
      langDesc:
        'Ubah bahasa antarmuka ViciTech secara instan antara Bahasa Indonesia (ID) dan English (EN) di navbar, modal, dan seluruh halaman utama.',
      langIdSub: 'ID (Utama)',
      langEnSub: 'EN (English)',
      tempUnitTitle: 'Satuan Suhu Telemetri',
      tempUnitDesc:
        'Berlaku langsung pada pembacaan suhu CPU/GPU di Panel IoT QC, pratinjau Burn-In Beranda, dan konsol diagnostik.',
      tempCelsiusLabel: 'Celsius (°C)',
      tempFahrenheitLabel: 'Fahrenheit (°F)',
      compactNumbersTitle: 'Format Angka Ringkas',
      compactNumbersDesc:
        'Ringkas angka besar telemetri (mis. 1.850 RPM → 1,9 rb RPM) agar lebih cepat dipindai pada layar sempit.',
      compactNumbersAria: 'Aktifkan Format Angka Ringkas',
      sourceBadgesTitle: 'Badge Sumber Data Referensi',
      sourceBadgesDesc:
        'Tampilkan seluruh badge Sample / Simulated di etalase & beranda. Jika dimatikan, indikator verifikasi penting di Panel IoT QC tetap tampil ringkas.',
      sourceBadgesAria: 'Tampilkan Badge Sumber Data Referensi',
      readoutPreviewTitle: 'Pratinjau Pembacaan Langsung',
      readoutPreviewTemp: 'Burn-In CPU',
      readoutPreviewFan: 'Kipas Bench',
      readoutPreviewPrice: 'Estimasi Rig',
      readoutPreviewBadgesMinimal: 'Badge dekoratif disembunyikan · indikator QC penting tetap aktif',
      navSectionTitle: 'Navigasi & Kenyamanan Mobile',
      navSectionDesc:
        'Atur perilaku bilah navigasi saat halaman digulir dan sesuaikan kepadatan ruang pada layar ponsel (360px–414px).',
      navScrollTitle: 'Perilaku Navbar Saat Gulir',
      navScrollDesc:
        'Pilih mode Ikon Saja agar layar terasa lebih lega saat menggulir, atau Tetap Tampilkan Label untuk pengenalan menu lebih cepat.',
      navScrollCollapseLabel: 'Ikon Saat Gulir',
      navScrollCollapseSub: 'Ringkas otomatis',
      navScrollKeepLabel: 'Tetap Tampilkan Label',
      navScrollKeepSub: 'Teks selalu terlihat',
      mobileDensityTitle: 'Kepadatan Tata Letak Mobile',
      mobileDensityDesc:
        'Mode Ringkas merapatkan jarak kartu & padding vertikal di layar ponsel agar lebih banyak informasi terlihat sekali pandang.',
      mobileDensityComfortableLabel: 'Nyaman',
      mobileDensityComfortableSub: 'Ruang lega (Default)',
      mobileDensityCompactLabel: 'Ringkas',
      mobileDensityCompactSub: 'Lebih padat di mobile',
      touchTargetNote:
        'Target sentuh minimum 44px dan ruang aman bawah (pb-24) tetap dijaga otomatis di semua mode kepadatan.',
      privacyTitle: 'Privasi & Data Akun (UU PDP)',
      privacyDesc:
        'Kelola preferensi cookie, unduh salinan data pribadi Anda, atau ajukan permintaan penghapusan akun sesuai UU No. 27 Tahun 2022.',
      cookieCardTitle: 'Pengaturan Cookie',
      cookieCardDesc:
        'Tinjau kategori cookie Esensial & Preferensi serta kebijakan pelindungan data pribadi ViciTech.',
      cookieCardBtn: 'Buka Pengaturan Cookie',
      exportCardTitle: 'Ekspor Data Saya',
      exportCardDesc:
        'Unduh file JSON berisi ringkasan profil, riwayat pesanan, dan postingan komunitas milik akun Anda.',
      exportBtn: 'Ekspor Data Saya (.json)',
      exportPreparing: 'Menyiapkan JSON…',
      exportLoginBtn: 'Masuk untuk Ekspor Data',
      deleteCardTitle: 'Hapus Akun / Data',
      deleteCardDesc:
        'Ajukan penghapusan akun & data pribadi secara permanen. Permintaan akan diverifikasi admin demi keamanan.',
      deleteBtn: 'Ajukan Penghapusan Akun / Data',
      deleteLoginBtn: 'Masuk untuk Mengajukan',
      deleteModalTitle: 'Konfirmasi Penghapusan Data',
      deleteModalSub: 'Hak Penghapusan Data Pribadi (UU PDP)',
      deleteCancel: 'Batal',
      deleteSubmit: 'Kirim Permintaan Penghapusan',
      deleteSending: 'Mengirim…',
    },
    routes: {
      market: {
        badge: 'Market & Hardware Library',
        titleReady: 'Etalase Market & Unit Siap Kirim',
        titleLibrary: 'Hardware Library, Spesifikasi & Potensi Upgrade',
        tabReady: 'Semua / Siap Kirim',
        tabLibrary: 'Hardware Library & Spesifikasi',
        bannerSummary:
          'Pilih PC rakitan, laptop IoT QC, komponen, serta perangkat Kamera & Produksi (kamera, lensa, gimbal, lighting, camera rig/cage, tripod fluid head, dan field monitor).',
        searchPlaceholder:
          'Cari PC, laptop, kamera, lensa, gimbal, lighting, camera rig/cage, tripod, atau field monitor…',
        stockAll: 'Semua',
        stockReady: 'Siap Kirim',
        stockPreorder: 'Pre-Order',
        qcToggle: 'Lulus IoT QC',
        sortLabel: 'Urutkan:',
        sortNewest: 'Terbaru',
        sortPriceAsc: 'Harga Terendah',
        sortPriceDesc: 'Harga Tertinggi',
        categoryAll: 'Semua',
        categoryCameraProduction: 'Kamera & Produksi',
        cameraFilterHeading: 'Sub-Kategori Kamera & Produksi',
        cameraFilterDesc:
          'Mencakup kamera, lensa, gimbal, lighting, camera rig/cage (ulir 1/4"-20 & 3/8"-16 ARRI, rod 15mm), tripod/fluid head, dan field monitor high-bright.',
        cameraSampleNotice:
          'Entri bertanda Sample / Simulated QC adalah data katalog referensi untuk pratinjau spesifikasi & checkpoint QC Kamera & Produksi.',
        cameraSubtypeAll: 'Semua Gear',
        showingPrefix: 'Menampilkan',
        showingUnit: 'produk',
        reset: 'Reset',
        datasheetBtn: 'Datasheet',
        datasheetTitle: 'Datasheet & Checkpoint QC',
        datasheetSpecsHeading: 'Spesifikasi Teknis',
        datasheetQcHeading: 'Checkpoint Verifikasi QC',
        datasheetOpenDetail: 'Buka Halaman Detail',
        datasheetCloseAria: 'Tutup datasheet produk',
      },
      builder: {
        badge: 'Data Referensi & Inventori',
        eyebrow: 'Rakit dengan Kepastian Kompatibilitas',
        title: 'Smart Preset Builder & Konfigurator',
        desc: 'Mulai dari preset teruji sesuai segmen kebutuhan, ganti komponen apa saja, dan pantau harga, estimasi beban daya PSU, serta Buffer Pasar JIT 5% secara langsung.',
        budgetHeading: 'Filter Anggaran Cepat',
      },
      bottleneck: {
        badge: 'Simulasi Keseimbangan & Daya',
        eyebrow: 'Kalkulator Telemetri ViciTech',
        title: 'Analisis Bottleneck & Headroom PSU',
        desc: 'Evaluasi keseimbangan CPU dan GPU berdasarkan skenario resolusi, cek kompatibilitas soket/DDR4–DDR5, hitung margin aman daya PSU +35%, dan dapatkan rekomendasi upgrade terukur.',
        meterTitlePrefix: 'Meter Bottleneck',
        gaugeCaption: 'Bottleneck',
        statusOptimal: 'Optimal',
        statusWarning: 'Perhatian',
        statusHigh: 'Bottleneck Tinggi',
        legendOptimal: 'Optimal',
        legendWarning: 'Perhatian',
        legendHigh: 'Bottleneck',
        directionBalanced: 'Seimbang / Optimal',
        directionCpuMild: 'CPU Bottleneck Ringan',
        directionCpuSevere: 'CPU Bottleneck Berat',
        directionGpuMild: 'GPU Bottleneck Ringan',
        directionGpuSevere: 'GPU Bottleneck Berat',
        cpuUtilization: 'Utilisasi CPU',
        gpuUtilization: 'Utilisasi GPU',
        primaryLimiter: 'Pembatas Utama',
        askAiCta: 'Tanya ViciTech AI soal Hasil Ini',
        shareCardCta: 'Bagikan / Unduh Kartu Hasil',
        preparingCard: 'Menyiapkan Kartu…',
        closeShareNoticeAria: 'Tutup notifikasi kartu hasil',
        scenarioLabels: {
          '1080p_esports': '1080p Esports',
          '1440p_aaa': '1440p AAA',
          '4k_ultra': '4K Ultra',
          rendering: 'Rendering & Produktivitas',
        },
        projectedLabels: {
          '1080p_esports': { label: 'Proyeksi FPS Esports (1080p)', unit: 'FPS' },
          '1440p_aaa': { label: 'Proyeksi FPS Game AAA (1440p High)', unit: 'FPS' },
          '4k_ultra': { label: 'Proyeksi FPS 4K Ultra (2160p)', unit: 'FPS' },
          rendering: { label: 'Indeks Kecepatan Render & Ekspor 4K', unit: 'indeks / 100' },
        },
        psuTitle: 'Headroom Daya PSU',
        psuStatusSafe: 'Aman / Optimal',
        psuStatusTight: 'Mepet',
        psuStatusInsufficient: 'Tidak Disarankan / Kurang Daya',
        psuStatusUnspecified: 'PSU Belum Dipilih',
        psuEstLoad: 'Estimasi Beban',
        psuRecommended: 'Rekomendasi (+35%)',
        psuLoadOnPrefix: 'Beban terhadap PSU',
        psuNoneSelected: 'Belum ada PSU dipilih',
        psuMeterAria: 'Persentase beban daya PSU',
        psuHintSafe: '0% Aman',
        psuHintIdeal: '75% Ideal',
        psuHintCritical: '90%+ Kritis',
        compatTitle: 'Daftar Periksa Kompatibilitas',
        compatSocketLabel: 'Soket CPU & Motherboard',
        compatMemoryLabel: 'Generasi Memori (DDR4 / DDR5)',
        compatRamCapPrefix: 'Kapasitas RAM',
        compatPsuLabel: 'Headroom Daya PSU (+35% Safety Buffer)',
      },
      versus: {
        badge: 'Skor Simulasi Terbobot',
        eyebrow: 'Mesin Komparasi ViciTech',
        title: 'Versus Arena',
        desc: 'Bandingkan dua konfigurasi PC, CPU, GPU, laptop, atau smartphone dalam kategori yang sama berdasarkan bobot skenario nyata dan indeks Price-to-Performance.',
      },
      upgrade: {
        badge: 'Data Referensi',
        eyebrow: 'Analisis Ekspansi Hardware',
        title: 'Analisis Potensi Upgrade Maksimal',
        desc: 'Cek batas kapasitas RAM, slot NVMe dan SATA kosong, serta estimasi biaya upgrade dari katalog preset maupun input manual perangkat Anda sendiri.',
      },
      tradeIn: {
        badge: 'Tarif Referensi',
        eyebrow: 'Perpanjang Siklus Pakai Perangkat Keras',
        title: 'Portal Trade-In & Buyback Sirkular',
        desc: 'Simulasikan estimasi nilai beli kembali (buyback) atau tukar tambah perangkat keras lama Anda dalam 3 langkah ringkas untuk pengajuan individu, sekolah, maupun perusahaan.',
        step1Label: 'Langkah 1 dari 3',
        step1Title: 'Pilih Segmen Pengaju Trade-In',
      },
      qcPanel: {
        eyebrow: 'ViciTech · Kontrol Kualitas',
        title: 'Panel Diagnostik IoT QC',
        desc: 'Periksa kesehatan perangkat, pantau progres pesanan, dan verifikasi sumber data IoT QC secara transparan.',
        waitingBadge: 'Menunggu Data Serial',
        statEngineLabel: 'Mesin Telemetri',
        statEngineValue: 'IoT QC 15-Titik',
        statStorageLabel: 'Penyimpanan Laporan',
        statStorageValue: 'Supabase Realtime',
        statModeLabel: 'Mode Inspeksi',
        statModeValue: 'Pelacakan Serial & Order',
      },
      partners: {
        verifiedBadge: (count) => `${count} Mitra Terverifikasi`,
        fallbackBadge: 'Direktori Mitra ViciTech',
        qcBtn: 'Panel IoT QC Bench',
        title: 'Toko komponen dan service center tepercaya.',
        desc: 'Temukan mitra perakitan PC, pusat perbaikan laptop, dan titik inspeksi fisik Trade-In terverifikasi di kota Anda. Hubungi teknisi kami lewat pesan langsung atau cek lokasi Google Maps masing-masing mitra di bawah ini.',
        dmCta: 'Chat Teknisi via DM',
        tradeInCta: 'Ajukan Inspeksi Trade-In',
        shareLabel: 'Bagikan Direktori',
      },
      community: {
        liveBadge: 'Feed Komunitas Aktif',
        sampleBadge: 'Feed Sampel Lokal',
        eyebrow: 'Berbagi rakitan & solusi teknis',
        title: 'Komunitas & Pusat Pengetahuan',
        desc: 'Pamerkan rakitan PC Anda, pelajari praktik terbaik dari admin lab CBT maupun teknisi tersertifikasi, dan diskusikan solusi perangkat keras harian.',
        createPostBtn: 'Buat Postingan Lengkap',
        categories: {
          all: 'Semua Postingan',
          hardware: 'Hardware & Rakit',
          gaming: 'Gaming & Mabar',
          dev: 'Dev & Coding',
          creative: 'Desain & Kreatif',
          qa: 'Tanya Jawab Teknis',
          guide: 'Panduan & Diskusi',
          meme: 'Meme Tech',
          news: 'Pengumuman Resmi',
        },
        roles: {
          tech: 'Teknisi Tersertifikasi',
          lab: 'Admin Lab CBT',
          fan: 'Penggemar Hardware',
          buyer: 'Tim Pengadaan IT',
          team: 'Tim ViciTech',
          member: 'Anggota',
        },
        composerTitle: 'Bagikan Rakitan atau Ajukan Pertanyaan',
        composerTitleLabel: 'Judul postingan',
        composerTitlePlaceholder: 'cth. Workstation editing 4K senyap di bawah Rp 40 jt',
        composerCategoryLabel: 'Kategori',
        composerDetailLabel: 'Detail',
        composerPrompts: {
          hardware: 'Ceritakan rakitan atau komponen Anda: daftar part, suhu kerja, dan potensi upgrade. Sertakan tag seperti #RTX4060.',
          gaming: 'Bagikan info game, benchmark FPS, atau ajakan mabar (LFG). Tambahkan tag seperti #Valorant atau #LFG.',
          dev: 'Diskusikan setup Docker, local LLM, atau integrasi ESP32 Anda. Tambahkan tag seperti #Docker atau #ESP32.',
          creative: 'Ceritakan workstation rendering, kalibrasi warna layar, atau workflow 4K Anda. Tambahkan tag seperti #CreatorRig.',
          qa: 'Kendala apa yang sedang terjadi? Cantumkan seri perangkat dan gejala lengkap beserta tag seperti #PSU.',
          guide: 'Bagikan panduan teknis untuk lab sekolah, kantor, atau perawatan laptop. Tambahkan tag seperti #CBTSetup.',
          meme: 'Bagikan momen unik atau humor seputar dunia rakit PC dan oprek hardware. Tambahkan tag seperti #PCMeme.',
          news: 'Tulis pengumuman resmi ekosistem ViciTech untuk seluruh anggota komunitas.',
        },
        composerTagsDetected: 'Tag terdeteksi:',
        composerMediaBtn: 'Foto / Video',
        composerAttachSpecs: 'Lampirkan Spec Sheet',
        composerAttachedSpecs: 'Spec Sheet Terlampir',
        composerSpecSampleTitle: 'Contoh Spec Sheet Rakitan',
        composerPublishBtn: 'Terbitkan Postingan',
        composerUploading: 'Mengunggah media…',
        composerSaving: 'Menerbitkan…',
        composerAttachmentHint: 'Mendukung hingga 4 foto (JPG/PNG/WebP) atau 1 video (MP4/WebM), maks. 30 MB per berkas.',
        composerPublishedNotice: 'Postingan Anda berhasil diterbitkan di bagian atas feed.',
        composerTitleMinError: 'Judul postingan minimal 5 karakter.',
        composerBodyMinError: 'Tambahkan detail minimal 10 karakter agar anggota lain dapat memahami konteksnya.',
        searchTabPosts: 'Postingan',
        searchTabUsers: 'Pengguna',
        searchHintPosts: 'Filter diskusi berdasarkan kata kunci, tag, atau kategori',
        searchHintUsers: 'Cari anggota untuk kirim pesan (DM) atau lihat postingan',
        searchPlaceholderPosts: 'Cari topik, hardware, atau tag seperti #RTX4060',
        searchPlaceholderUsers: 'Cari nama atau @username (cth. Rizky, @bagas)…',
        searchClearAria: 'Bersihkan kata kunci pencarian',
        searchingUsers: 'Mencari anggota komunitas…',
        backToPosts: 'Kembali ke Postingan',
        usersNotFoundTitle: 'Pengguna tidak ditemukan',
        authorFilterPrefix: 'Menampilkan postingan dari',
        showAllBtn: 'Tampilkan Semua',
        showingPrefix: 'Menampilkan',
        showingUnit: 'postingan',
        loadMoreBtn: 'Muat lebih banyak postingan',
        emptyTitle: 'Belum ada postingan yang cocok dengan filter.',
        emptyDesc: 'Coba kata kunci atau kategori lain, atau mulai diskusi baru.',
        resetFilterBtn: 'Reset Filter',
        commentsLabel: 'Komentar',
        shareBtn: 'Bagikan',
        shareSpecsBtn: 'Bagikan Spek',
        reportBtn: 'Laporkan',
        reportPrompt: 'Laporkan konten ini:',
        noComments: 'Belum ada komentar. Jadilah yang pertama membalas.',
        replyPlaceholder: 'Tulis balasan atau pilih GIF…',
        replySendAria: 'Kirim balasan',
        specsHeader: 'Rincian Spesifikasi Hardware',
        specsTotalLabel: 'Total estimasi rakitan',
        memberViewPosts: 'Lihat Postingan',
        memberProfile: 'Profil',
        memberSendDm: 'Kirim Pesan',
        sidebarContributors: 'Kontributor Aktif',
        sidebarLikesUnit: 'suka',
        sidebarPostsUnit: 'postingan',
        sidebarNoContributors: 'Belum ada aktivitas kontributor yang dimuat.',
        sidebarGuides: 'Topik Panduan Cepat',
        sidebarTopTags: 'Tag Hardware Populer',
        sidebarNoTags: 'Tag akan muncul otomatis dari postingan komunitas.',
      },
      aiConsultant: {
        eyebrow: 'Toolkit ViciTech',
        title: 'Konsultan Rakitan AI',
        desc: 'Temukan arah rakitan PC, cek opsi upgrade laptop, dan pahami layanan ViciTech bersama konsultan hardware.',
        disclaimer: 'Ketersediaan dan harga perangkat mengikuti katalog ViciTech Market saat konsultasi dimulai.',
      },
      feedback: {
        eyebrow: 'Validasi Pengguna ViciTech OS',
        title: 'Umpan Balik & Laporan Uji Coba',
        desc: 'Bantu kami menyempurnakan Smart Preset Builder, Bottleneck Analyzer, Upgrade Analyzer, Market, dan Konsultan AI. Setiap laporan Anda menjadi bukti validasi pengembangan ViciTech.',
        howProcessedTitle: 'Bagaimana Masukan Diproses?',
        privacyCardTitle: 'Pelindungan Data Pribadi (UU PDP)',
        privacyCardCta: 'Baca Kebijakan Cookie & Privasi (UU PDP)',
      },
      cookies: {
        eyebrow: 'Kepatuhan UU No. 27 Tahun 2022 (UU PDP)',
        title: 'Kebijakan Cookie & Pelindungan Data Pribadi',
        desc: 'ViciTech berkomitmen melindungi data pribadi pengguna secara transparan sesuai Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP). Halaman ini menjelaskan bagaimana kami menggunakan cookie, memproses data, dan menjamin hak privasi Anda.',
        dataRequestCta: 'Ajukan Permintaan Data',
      },
    },
  },
  en: {
    nav: {
      homeAria: 'ViciTech Home',
      mainNavAria: 'ViciTech main navigation',
      groups: {
        market: { label: 'Market' },
        toolkit: { label: 'Toolkit' },
        services: { label: 'Services & QC' },
        community: {
          label: 'Community',
          description: 'Build showcases, technical guides & community Q&A.',
        },
      },
      subItems: {
        'market-ready': {
          label: 'Market Storefront',
          description: 'Ready-to-ship custom PCs & IoT QC-certified laptops.',
        },
        'market-catalog': {
          label: 'Hardware Library',
          description: 'Complete catalog of CPU, GPU, laptop & component specs.',
        },
        'toolkit-builder': {
          label: 'Preset Builder',
          description: 'Smart PC builder with socket, DDR & TDP compatibility checks.',
        },
        'toolkit-bottleneck': {
          label: 'Bottleneck Analyzer',
          description: 'Evaluate CPU & GPU balance plus PSU safety headroom.',
        },
        'toolkit-versus': {
          label: 'Versus Arena',
          description: 'Compare hardware specifications head-to-head.',
        },
        'toolkit-upgrade': {
          label: 'Upgrade Analyzer',
          description: 'Check maximum RAM & storage expansion slots for your device.',
        },
        'toolkit-ai-consultant': {
          label: 'AI Build Consultant',
          description: 'Live AI guidance for PC builds, laptop upgrades & ViciTech catalog.',
        },
        'service-qc': {
          label: 'IoT QC Panel',
          description: 'Track assembly status & ESP32 burn-in telemetry certificates.',
        },
        'service-tradein': {
          label: 'Trade-In & Refurbished',
          description: 'Trade in old hardware or explore certified refurbished units.',
        },
        'service-partners': {
          label: 'Partners & Service',
          description: 'Find trusted local component stores & verified repair centers.',
        },
      },
      mobileBottom: {
        home: { label: 'Home', shortLabel: 'Home' },
        market: { label: 'Market', shortLabel: 'Market' },
        builder: { label: 'Toolkit', shortLabel: 'Toolkit' },
        tradein: { label: 'Services & QC', shortLabel: 'Services' },
        community: { label: 'Community', shortLabel: 'Community' },
      },
      searchTitle: 'Quick search (Ctrl+K)',
      searchAria: 'Search ViciTech (Ctrl+K)',
      cartTitle: 'Shopping Cart',
      cartAria: (count) => (count > 0 ? `Shopping Cart (${count} items)` : 'Shopping Cart'),
      messagesAria: (unread) => (unread > 0 ? `Direct Messages (${unread} unread)` : 'Direct Messages'),
      notificationsTitle: 'Notifications',
      notificationsAria: (unread) => (unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'),
      markAllRead: 'Mark all read',
      notificationsLoginPrompt: 'Sign in to view your order updates, comments, and direct messages.',
      loginToAccount: 'Sign In',
      noNotifications: 'No new notifications yet.',
      openMenuAria: 'Open ViciTech navigation menu',
      closeMenuAria: 'Close navigation menu',
      drawerSubtitle: 'Circular IT & Hardware QC Ecosystem',
      drawerSocialHeading: 'Social & Guides',
      drawerThemeHeading: 'Appearance Theme',
      drawerWorkspaceHeading: 'Workspace & Account',
      homeLabel: 'Home',
      homeDesc: 'Main landing page of the ViciTech Circular IT & Hardware QC ecosystem.',
      dmLabel: 'Direct Messages',
      dmDesc: 'Chat directly with certified technicians & fellow builders.',
      dmUnread: (count) => `${count} unread messages`,
      profileLabel: 'Profile & Account',
      profileDesc: 'Orders, saved build presets & account preferences.',
      settingsLabel: 'Settings & Privacy',
      settingsDesc: 'Language, theme, display accessibility, data export & privacy controls.',
    },
    themeToggle: {
      switchToLight: 'Switch to Light Mode',
      switchToDark: 'Enable Dark Mode (Obsidian Ruby Pixel)',
      darkTitle: 'Dark Mode · Obsidian Ruby Pixel',
      darkSub: 'Tap to switch back to Light Mode',
      lightTitle: 'Light Mode · Standard',
      lightSub: 'Tap to enable Obsidian Ruby Pixel UI',
    },
    aiWidget: {
      ask: 'Ask ViciTech AI',
      close: 'Close ViciTech AI',
      expandAria: 'Expand chat to full screen',
      minimizeAria: 'Minimize chat window',
      closeWindowAria: 'Close chat window',
      loading: 'Preparing consultant…',
    },
    hero: {
      eyebrow: 'Indonesian Circular IT & Precision Hardware Toolkit',
      headline: 'Buy, build, and upgrade PCs & laptops with total confidence.',
      subheadline:
        'From real-time build & bottleneck simulation, 15-point Hybrid IoT QC verification (Simulated / Demo), to catalog-connected ViciTech AI — unified in one transparent platform.',
      primaryCta: 'Explore QC Market',
      secondaryCta: 'Start PC Builder',
      trustAria: 'ViciTech core advantages',
      pauseBg: 'Pause background animation',
      playBg: 'Play background animation',
      pillars: [
        { title: '15-Point Hybrid IoT QC', subtitle: 'Simulated / Demo Mode', badge: 'Simulated' },
        { title: 'NIST SP 800-88 Data Wipe', subtitle: 'Certified secure erasure', badge: null },
        { title: 'Catalog-Live ViciTech AI', subtitle: 'Spec & price guidance', badge: null },
        { title: 'Free Without Login', subtitle: 'Try every toolkit instantly', badge: null },
      ],
    },
    bento: {
      eyebrow: 'ViciTech Tri-Pillar Moat',
      headline: 'Three pillars that make every hardware decision sharper and safer.',
      subtitle:
        'Combine precision simulation tools, transparent quality verification, and an active builder community before spending a single rupiah.',
      p1Badge: 'Pillar 1 · Simulation Toolkit',
      p1Meta: 'Free · No Login',
      p1Title: 'Simulate builds, bottlenecks, and upgrades before buying parts.',
      p1Desc:
        'Validate socket & DDR compatibility, calculate +35% PSU safety headroom, estimate per-game FPS, and inspect RAM/SSD expansion limits with ViciTech AI.',
      p1PreviewTitle: 'Sample Simulation · Ryzen 5 7600 + RTX 4060',
      p1PreviewStatus: 'Balanced (4.2%)',
      p1PsuLabel: 'PSU Load',
      p1FpsLabel: '1080p Competitive',
      p1JitLabel: 'JIT Buffer',
      p1JitValue: '5% Dynamic',
      p1CtaBuilder: 'Preset Builder',
      p1CtaBottleneck: 'Bottleneck',
      p1CtaUpgrade: 'Upgrade Analyzer',
      p1CtaAi: 'AI Consultant',
      p2Badge: 'Pillar 2 · Hybrid IoT QC',
      p2Title: '15-point inspection & tamper-proof serial certificates.',
      p2Desc:
        'Transparent thermal burn-in logs, voltage stability checks, and NIST SP 800-88 data sanitization verifiable publicly by serial number. Physical ESP32 sensors roll out in v2.5.',
      p2DemoTag: 'QC Demo Profile',
      p2BurnInLabel: 'CPU/GPU Thermal Burn-In',
      p2BurnInValue: '64.0°C · Stable',
      p2SanitationLabel: 'NIST SP 800-88 Sanitization',
      p2SanitationValue: '15/15 Passed',
      p2Cta: 'Open IoT QC Simulation Panel',
      p3Badge: 'Pillar 3 · Community Hub',
      p3Meta: 'Discussions & Direct DM',
      p3Title: 'Learn from real rigs, find members, and message builders directly.',
      p3Desc:
        'Share custom PC builds, ask about real-world laptop upgrades, or message trusted technicians and community builders directly on ViciTech.',
      p3CtaCommunity: 'Explore Community',
      p3CtaMessages: 'Direct Messages',
      p4Badge: 'Market & Circular Trade-In',
      p4Title: 'PCs, Laptops, Consoles & Handhelds in one curated storefront.',
      p4Desc:
        'Order ready-to-ship certified rigs with Smart Part Matcher or trade in your old devices transparently.',
      p4CtaMarket: 'Open Market',
      p4CtaTradeIn: 'Trade-In',
    },
    showcase: {
      sectionAria: 'ViciTech Circular IT architecture overview',
      manifestoBadge: 'ViciTech Circular IT Ecosystem',
      manifestoHeadline:
        'We deliver precision hardware transparency for builders, gamers, schools, and enterprise fleets.',
      manifestoPrimaryCta: 'Start Building in Workspace',
      manifestoSecondaryCta: 'Explore Market',
      diagramBadge: 'Multi-Device Verification Protocol · Demo QC',
      diagramHeadline: 'Four verification and guarantee pillars behind every ViciTech unit.',
      callouts: {
        'callout-esp32': {
          badgeLabel: 'Simulated / Demo',
          title: '15-Point QC Protocol & Burn-In Telemetry',
          summary:
            'Simulated CPU/GPU thermal profiles, voltage checks, and public serial certificates (physical ESP32 sensor integration scheduled for v2.5).',
        },
        'callout-nist': {
          badgeLabel: 'Simulated / Demo',
          title: 'NIST 800-88 Standard Data Sanitization',
          summary: 'Permanent data erasure for B2B enterprise fleets, B2S school labs, and Trade-In units.',
        },
        'callout-jit': {
          badgeLabel: 'Sample',
          title: '5% JIT Procurement Buffer (B2S & B2B)',
          summary: 'Automated reserve stock and power budget calculation so institutional rollouts stay smooth.',
        },
        'callout-tradein': {
          badgeLabel: 'Sample',
          title: 'Trade-In Valuation & Grade A+ Refurbished',
          summary: 'Convert legacy hardware into upgrade credit toward certified business laptops or parts.',
        },
      },
      workflowBadge: 'Unified Workflow',
      workflowHeadline: 'Every device moves cleanly from research to verified deployment.',
      steps: {
        'step-riset': {
          phaseLabel: 'Research Phase',
          title: 'Spec Analysis & Upgrade Potential',
          summary:
            'Compare phones, laptops, desktops, and accessories side by side while checking maximum RAM and NVMe slot capacity.',
          deliverables: ['Side-by-side 4-device compare', 'Slot expansion ceiling check'],
          actionLabel: 'Open Hardware Library',
        },
        'step-konfigurasi': {
          phaseLabel: 'Configuration Phase',
          title: 'Preset Builds & Bottleneck Simulation',
          summary:
            'Configure B2C gaming rigs, B2B workstations, or B2S CBT school labs with live PSU wattage and CPU/GPU bottleneck checks.',
          deliverables: ['Live wattage & FPS estimates', '5% JIT procurement buffer'],
          actionLabel: 'Configure in Preset Builder',
        },
        'step-verifikasi': {
          phaseLabel: 'QC Verification Phase',
          title: 'Burn-In Testing & Telemetry Certification',
          summary:
            'Every assembled or refurbished unit completes a 15-point checklist bound to a public VICI-XXX verification serial code.',
          deliverables: ['Thermal & voltage telemetry logs', 'Anti-lemon digital certificate'],
          actionLabel: 'Check IoT QC Serial',
        },
        'step-sirkular': {
          phaseLabel: 'Ecosystem Phase',
          title: 'Circular Trade-In & Service Partners',
          summary:
            'Trade in single devices or bulk fleets and connect with verified local repair centers and component partners.',
          deliverables: ['Instant trade-in valuation', 'Direct DM with partner technicians'],
          actionLabel: 'Open Trade-In Portal',
        },
      },
      pillarsBadge: 'ViciTech Pillar Directory',
      pillarsHeadline: 'Every component and device carries a transparent verification trail.',
      pillarsCta: 'Browse Market Storefront',
      pillars: {
        'pillar-library': {
          title: 'Hardware Library & Upgrades',
          description:
            'Unified spec catalog to compare smartphones, business laptops, desktop CPUs/GPUs, and inspect RAM/NVMe expansion limits.',
          tags: ['4 Core Categories', 'Expansion Calculator', 'Spec Comparison'],
          badgeLabel: 'Sample Catalog',
          actionLabel: 'Open Library',
        },
        'pillar-qc': {
          title: 'IoT Smart Bench & QC Engine',
          description:
            'Serial number tracking powered by admin-simulated test profiles (Simulated / Demo) explicitly separated from live ESP32 sensors.',
          tags: ['15-Point Protocol', 'NIST 800-88 Wipe', 'QR Verification'],
          badgeLabel: 'Simulated / Demo',
          actionLabel: 'Track QC Serial',
        },
        'pillar-market': {
          title: 'Curated Market & Presets',
          description:
            'Ready-to-ship builds for gaming, creators, offices, and school labs with full socket and power validation.',
          tags: ['B2C / B2B / B2S Presets', '5% JIT Buffer', 'Creator Verdict'],
          badgeLabel: 'Sample Preview',
          actionLabel: 'View Market',
        },
        'pillar-partners': {
          title: 'Service Centers & Local Partners',
          description:
            'Verified network of laptop/PC repair technicians and parts shops for direct consultation and physical Trade-In inspection.',
          tags: ['Bandung & South Jakarta Hubs', 'B2S Lab Support', 'Direct DM'],
          badgeLabel: 'Sample Partners',
          actionLabel: 'Partner Directory',
        },
      },
      closingHeadline: 'Build, diagnose, and manage your hardware lifecycle in one place.',
      closingDesc:
        'From custom desktop builds and enterprise laptops to smartphones and peripherals, everything connects in one transparent ecosystem.',
      closingPrimaryCta: 'Open Community Hub',
      closingSecondaryCta: 'Find Service Partners',
    },
    footer: {
      description:
        'Circular IT ecosystem for hardware spec research, curated B2S/B2B/B2C builds, asset trade-in, and ESP32 telemetry-backed quality verification.',
      badgeRef: 'Reference Specs',
      ecosystemHeading: 'Ecosystem',
      verificationHeading: 'Verification & Standards',
      checkSerialCta: 'Check IoT QC Serial Number',
      standards: [
        'NIST 800-88 Data Sanitization',
        '15-Point IoT QC Protocol',
        '5% JIT Dynamic Buffer Policy',
        'Grade A+ Refurbished Certification',
      ],
      links: {
        '/': 'Home',
        '/market': 'Market & Hardware Library',
        '/builder': 'Smart Preset Builder',
        '/trade-in': 'Circular Trade-In',
        '/partners': 'Partners & Service',
        '/community': 'Community',
        '/feedback': 'Feedback & Validation',
      },
      copyright: (year) => `© ${year} ViciTech. All rights reserved.`,
      disclaimer:
        'Catalog prices are reference estimates; physical sensor telemetry and simulated profiles are explicitly separated.',
      settings: 'Settings',
      feedback: 'Feedback',
      cookies: 'Cookie & Privacy Policy',
    },
    settings: {
      pageEyebrow: 'ViciTech OS Control Center',
      pageTitle: 'Settings, Comfort & Privacy',
      pageDesc:
        'Customize visual appearance, Pixel UX intensity, language, telemetry readouts, mobile navigation comfort, and privacy rights in one place.',
      presetsTitle: 'Quick Comfort Presets',
      presetsDesc:
        'Apply a curated visual, readability, and navigation profile in one tap—your active language and privacy status stay untouched.',
      presetActive: 'Active',
      presetCustom: 'Custom',
      presetBalancedTitle: 'Default Balanced',
      presetBalancedDesc: 'Clean Light Mode, 100% text scale, compact icon-only navbar on scroll.',
      presetReadabilityTitle: 'High Readability',
      presetReadabilityDesc: 'High contrast, 112.5% text scale, subtle pixel accents, persistent nav labels.',
      presetObsidianTitle: 'Obsidian Pixel',
      presetObsidianDesc: 'Full Obsidian Ruby Pixel Dark Mode with compact mobile spacing.',
      resetBtn: 'Reset Defaults',
      resetConfirmPrompt:
        'Restore all appearance, telemetry, and navigation preferences to defaults? Any account privacy request remains preserved.',
      resetConfirmAction: 'Confirm Reset',
      resetCancelAction: 'Cancel',
      resetDoneNotice: 'Appearance, telemetry, and navigation preferences have been restored to defaults.',
      displayTitle: 'Appearance & Pixel UX',
      displayDesc:
        'Preferences apply instantly on this device and automatically sync to your profile when signed in.',
      syncSaving: 'Saving…',
      syncSaved: 'Synced to account',
      syncActive: 'Account sync active',
      syncLocal: 'Saved on this device',
      themeTitle: 'Display Theme',
      themeDescPrefix: 'Keep crisp Light Mode as default, or switch to Dark Mode powered by ',
      themeDescHighlight: 'Obsidian Ruby Pixel UI',
      themeDescSuffix: ' (while keeping sans-serif & tabular monospace typography sharp).',
      themeLightLabel: 'Light Mode',
      themeLightSub: 'Default · Tech Orange',
      themeDarkLabel: 'Dark Mode',
      themeDarkSub: 'Obsidian Ruby Pixel',
      pixelIntensityTitle: 'Pixel UI Accent Intensity',
      pixelIntensityDesc:
        'Use Standard pixel styling (hard shadows, obsidian grid, Silkscreen tags) or Subtle for softer radii and calmer visual framing.',
      pixelStandardLabel: 'Standard',
      pixelStandardSub: 'Full Pixel UI',
      pixelSubtleLabel: 'Subtle',
      pixelSubtleSub: 'Minimal & calm',
      contrastTitle: 'High Contrast Mode',
      contrastDesc:
        'Sharpen card borders, text contrast, and keyboard focus outlines for maximum legibility across light and dark themes.',
      contrastAria: 'Enable High Contrast Mode',
      textScaleTitle: 'Text Size Scale',
      textScaleDesc: 'Adjust base typography sizing for comfortable reading without breaking page layouts.',
      scaleNormal: 'Normal',
      scaleLarge: 'Large',
      scaleXLarge: 'Extra Large',
      motionTitle: 'Reduce Motion',
      motionDescPrefix: 'Disable UI transitions and motion effects. Your device OS preference is currently: ',
      motionReduced: 'Active (Reduced)',
      motionStandard: 'Standard',
      motionAria: 'Enable Reduce Motion',
      telemetrySectionTitle: 'Language & Telemetry Readout',
      telemetrySectionDesc:
        'Sync interface language globally across routes while configuring numeric formatting, IoT QC temperature units, and data-source badges.',
      langTitle: 'Interface Language',
      langDesc:
        'Switch ViciTech language immediately between Bahasa Indonesia (ID) and English (EN) across the navbar, modals, and core pages.',
      langIdSub: 'ID (Primary)',
      langEnSub: 'EN (English)',
      tempUnitTitle: 'Telemetry Temperature Unit',
      tempUnitDesc:
        'Applies live to CPU/GPU thermal readouts on the IoT QC Panel, Homepage burn-in preview, and diagnostic console.',
      tempCelsiusLabel: 'Celsius (°C)',
      tempFahrenheitLabel: 'Fahrenheit (°F)',
      compactNumbersTitle: 'Compact Telemetry Numbers',
      compactNumbersDesc:
        'Shorten large telemetry numbers (e.g. 1,850 RPM → 1.9K RPM) for faster scanning on compact viewports.',
      compactNumbersAria: 'Enable Compact Telemetry Numbers',
      sourceBadgesTitle: 'Reference Data-Source Badges',
      sourceBadgesDesc:
        'Show all Sample / Simulated badges across storefronts & landing pages. When off, essential live QC verification tags stay compact and visible.',
      sourceBadgesAria: 'Show Reference Data-Source Badges',
      readoutPreviewTitle: 'Live Readout Preview',
      readoutPreviewTemp: 'CPU Burn-In',
      readoutPreviewFan: 'Bench Fan',
      readoutPreviewPrice: 'Rig Estimate',
      readoutPreviewBadgesMinimal: 'Decorative badges hidden · essential QC verification indicators remain visible',
      navSectionTitle: 'Navigation & Mobile Comfort',
      navSectionDesc:
        'Control how navigation bars behave while scrolling and tailor spacing density for compact mobile viewports (360px–414px).',
      navScrollTitle: 'Navbar Scroll Behavior',
      navScrollDesc:
        'Collapse labels into compact icons while scrolling for extra reading room, or keep text labels visible at all times.',
      navScrollCollapseLabel: 'Icon-Only on Scroll',
      navScrollCollapseSub: 'Auto-compact',
      navScrollKeepLabel: 'Keep Labels',
      navScrollKeepSub: 'Always visible',
      mobileDensityTitle: 'Mobile Layout Density',
      mobileDensityDesc:
        'Compact mode tightens card padding and vertical gaps on phones so more hardware specs fit cleanly above the fold.',
      mobileDensityComfortableLabel: 'Comfortable',
      mobileDensityComfortableSub: 'Roomy (Default)',
      mobileDensityCompactLabel: 'Compact',
      mobileDensityCompactSub: 'Higher mobile density',
      touchTargetNote:
        'Minimum 44px touch targets and safe bottom clearance (pb-24) are automatically preserved in every density mode.',
      privacyTitle: 'Privacy & Account Data (UU PDP)',
      privacyDesc:
        'Manage cookie consent, export a copy of your personal data, or submit an account deletion request under Indonesia UU PDP No. 27/2022.',
      cookieCardTitle: 'Cookie Settings',
      cookieCardDesc:
        'Review Essential & Preference cookie categories along with ViciTech personal data protection policies.',
      cookieCardBtn: 'Open Cookie Settings',
      exportCardTitle: 'Export My Data',
      exportCardDesc:
        'Download a JSON archive containing your profile summary, order history, and community posts.',
      exportBtn: 'Export My Data (.json)',
      exportPreparing: 'Preparing JSON…',
      exportLoginBtn: 'Sign In to Export Data',
      deleteCardTitle: 'Delete Account / Data',
      deleteCardDesc:
        'Submit a permanent account and personal data deletion request verified by ViciTech administrators.',
      deleteBtn: 'Request Account / Data Deletion',
      deleteLoginBtn: 'Sign In to Request',
      deleteModalTitle: 'Confirm Data Deletion',
      deleteModalSub: 'Personal Data Erasure Right (UU PDP)',
      deleteCancel: 'Cancel',
      deleteSubmit: 'Submit Deletion Request',
      deleteSending: 'Submitting…',
    },
    routes: {
      market: {
        badge: 'Market & Hardware Library',
        titleReady: 'Market Storefront & Ready-to-Ship Units',
        titleLibrary: 'Hardware Library, Specs & Upgrade Potential',
        tabReady: 'All / Ready to Ship',
        tabLibrary: 'Hardware Library & Specs',
        bannerSummary:
          'Browse custom PCs, IoT QC laptops, components, and Camera & Production gear (cameras, lenses, gimbals, lighting, camera rigs/cages, fluid-head tripods, and field monitors).',
        searchPlaceholder:
          'Search PCs, laptops, cameras, lenses, gimbals, lighting, camera rigs/cages, tripods, or field monitors…',
        stockAll: 'All',
        stockReady: 'Ready Stock',
        stockPreorder: 'Pre-Order',
        qcToggle: 'IoT QC Passed',
        sortLabel: 'Sort:',
        sortNewest: 'Newest',
        sortPriceAsc: 'Lowest Price',
        sortPriceDesc: 'Highest Price',
        categoryAll: 'All',
        categoryCameraProduction: 'Camera & Production',
        cameraFilterHeading: 'Camera & Production Sub-Categories',
        cameraFilterDesc:
          'Covers cameras, lenses, gimbals, lighting, camera rigs/cages (1/4"-20 & 3/8"-16 ARRI threads, 15mm rods), fluid-head tripods, and high-bright field monitors.',
        cameraSampleNotice:
          'Entries marked Sample / Simulated QC are fallback reference listings showcasing tailored Camera & Production specs and QC checkpoints.',
        cameraSubtypeAll: 'All Gear',
        showingPrefix: 'Showing',
        showingUnit: 'products',
        reset: 'Reset',
        datasheetBtn: 'Datasheet',
        datasheetTitle: 'Datasheet & QC Checkpoints',
        datasheetSpecsHeading: 'Technical Specifications',
        datasheetQcHeading: 'QC Verification Checkpoints',
        datasheetOpenDetail: 'Open Full Detail Page',
        datasheetCloseAria: 'Close product datasheet',
      },
      builder: {
        badge: 'Reference & Inventory Data',
        eyebrow: 'Build with Verified Compatibility',
        title: 'Smart Preset Builder & Configurator',
        desc: 'Start from a validated segment preset, swap any component freely, and track pricing, PSU wattage load, and 5% JIT Market Buffer live.',
        budgetHeading: 'Quick Budget Filter',
      },
      bottleneck: {
        badge: 'Balance & Power Simulation',
        eyebrow: 'ViciTech Telemetry Calculator',
        title: 'Bottleneck & PSU Headroom Analyzer',
        desc: 'Evaluate CPU and GPU balance by target resolution, check socket/DDR4–DDR5 compatibility, verify +35% PSU safety headroom, and get measurable upgrade recommendations.',
        meterTitlePrefix: 'Bottleneck Meter',
        gaugeCaption: 'Bottleneck',
        statusOptimal: 'Optimal',
        statusWarning: 'Warning',
        statusHigh: 'High Bottleneck',
        legendOptimal: 'Optimal',
        legendWarning: 'Warning',
        legendHigh: 'Bottleneck',
        directionBalanced: 'Balanced / Optimal',
        directionCpuMild: 'Mild CPU Bottleneck',
        directionCpuSevere: 'Severe CPU Bottleneck',
        directionGpuMild: 'Mild GPU Bottleneck',
        directionGpuSevere: 'Severe GPU Bottleneck',
        cpuUtilization: 'CPU Utilization',
        gpuUtilization: 'GPU Utilization',
        primaryLimiter: 'Primary Limiter',
        askAiCta: 'Ask ViciTech AI about This Result',
        shareCardCta: 'Share / Download Result Card',
        preparingCard: 'Preparing Card…',
        closeShareNoticeAria: 'Close result card notification',
        scenarioLabels: {
          '1080p_esports': '1080p Esports',
          '1440p_aaa': '1440p AAA',
          '4k_ultra': '4K Ultra',
          rendering: 'Rendering & Productivity',
        },
        projectedLabels: {
          '1080p_esports': { label: 'Projected Esports FPS (1080p)', unit: 'FPS' },
          '1440p_aaa': { label: 'Projected AAA FPS (1440p High)', unit: 'FPS' },
          '4k_ultra': { label: 'Projected 4K Ultra FPS (2160p)', unit: 'FPS' },
          rendering: { label: '4K Render & Export Speed Index', unit: 'index / 100' },
        },
        psuTitle: 'PSU Power Headroom',
        psuStatusSafe: 'Safe / Optimal',
        psuStatusTight: 'Tight Margin',
        psuStatusInsufficient: 'Insufficient Power',
        psuStatusUnspecified: 'No PSU Selected',
        psuEstLoad: 'Estimated Load',
        psuRecommended: 'Recommended (+35%)',
        psuLoadOnPrefix: 'Load on PSU',
        psuNoneSelected: 'No PSU selected yet',
        psuMeterAria: 'PSU power load percentage',
        psuHintSafe: '0% Safe',
        psuHintIdeal: '75% Ideal',
        psuHintCritical: '90%+ Critical',
        compatTitle: 'Compatibility Checklist',
        compatSocketLabel: 'CPU & Motherboard Socket',
        compatMemoryLabel: 'Memory Generation (DDR4 / DDR5)',
        compatRamCapPrefix: 'RAM Capacity',
        compatPsuLabel: 'PSU Power Headroom (+35% Safety Buffer)',
      },
      versus: {
        badge: 'Weighted Simulation Score',
        eyebrow: 'ViciTech Comparison Engine',
        title: 'Versus Arena',
        desc: 'Compare two PC configurations, CPUs, GPUs, laptops, or smartphones head-to-head using real workload weights and Price-to-Performance indexing.',
      },
      upgrade: {
        badge: 'Reference Data',
        eyebrow: 'Hardware Expansion Analysis',
        title: 'Maximum Upgrade Potential Analyzer',
        desc: 'Check RAM capacity ceilings, free NVMe and SATA slots, and estimated upgrade costs from preset catalogs or your own custom device specs.',
      },
      tradeIn: {
        badge: 'Reference Rates',
        eyebrow: 'Extend Your Hardware Lifecycle',
        title: 'Circular Trade-In & Buyback Portal',
        desc: 'Simulate buyback or trade-in valuations for your existing hardware in 3 guided steps for individual, school, or enterprise submissions.',
        step1Label: 'Step 1 of 3',
        step1Title: 'Choose Your Trade-In Segment',
      },
      qcPanel: {
        eyebrow: 'ViciTech · Quality Control',
        title: 'IoT QC Diagnostic Panel',
        desc: 'Inspect hardware health, track order progress, and verify IoT QC telemetry data sources transparently.',
        waitingBadge: 'Awaiting Serial Lookup',
        statEngineLabel: 'Telemetry Engine',
        statEngineValue: '15-Point IoT QC',
        statStorageLabel: 'Report Storage',
        statStorageValue: 'Supabase Realtime',
        statModeLabel: 'Inspection Mode',
        statModeValue: 'Serial & Order Tracking',
      },
      partners: {
        verifiedBadge: (count) => `${count} Verified Partners`,
        fallbackBadge: 'ViciTech Partner Directory',
        qcBtn: 'IoT QC Bench Panel',
        title: 'Trusted component stores and service centers.',
        desc: 'Discover verified PC assembly partners, laptop repair specialists, and physical Trade-In inspection hubs near you. Message our technicians directly or check each partner location on Google Maps below.',
        dmCta: 'Message Technician via DM',
        tradeInCta: 'Request Trade-In Inspection',
        shareLabel: 'Share Directory',
      },
      community: {
        liveBadge: 'Live Community Feed',
        sampleBadge: 'Local Sample Feed',
        eyebrow: 'Build showcases & technical solutions',
        title: 'Community & Knowledge Hub',
        desc: 'Showcase your custom PC rigs, learn best practices from CBT lab admins and certified technicians, and discuss everyday hardware solutions.',
        createPostBtn: 'Create Full Post',
        categories: {
          all: 'All Posts',
          hardware: 'Hardware & Builds',
          gaming: 'Gaming & LFG',
          dev: 'Dev & Coding',
          creative: 'Design & Creative',
          qa: 'Tech Q&A',
          guide: 'Guides & Discussion',
          meme: 'Tech Memes',
          news: 'Official Announcements',
        },
        roles: {
          tech: 'Certified Technician',
          lab: 'CBT Lab Admin',
          fan: 'Hardware Enthusiast',
          buyer: 'IT Procurement Team',
          team: 'ViciTech Team',
          member: 'Member',
        },
        composerTitle: 'Share a Build or Ask a Question',
        composerTitleLabel: 'Post title',
        composerTitlePlaceholder: 'e.g. Quiet 4K editing workstation under Rp 40M',
        composerCategoryLabel: 'Category',
        composerDetailLabel: 'Details',
        composerPrompts: {
          hardware: 'Share your rig or component setup: parts list, temps, and upgrade path. Add tags like #RTX4060.',
          gaming: 'Share game benchmarks, FPS notes, or LFG squad invites. Add tags like #Valorant or #LFG.',
          dev: 'Discuss Docker setups, local LLMs, or ESP32 integrations. Add tags like #Docker or #ESP32.',
          creative: 'Share your rendering workstation, display calibration, or 4K workflow. Add tags like #CreatorRig.',
          qa: 'What issue are you troubleshooting? Include your device model, symptoms, and tags like #PSU.',
          guide: 'Share technical guides for school labs, offices, or laptop maintenance. Add tags like #CBTSetup.',
          meme: 'Share lighthearted moments from PC building and hardware tinkering. Add tags like #PCMeme.',
          news: 'Write an official ViciTech ecosystem announcement for the community.',
        },
        composerTagsDetected: 'Detected tags:',
        composerMediaBtn: 'Photo / Video',
        composerAttachSpecs: 'Attach Spec Sheet',
        composerAttachedSpecs: 'Spec Sheet Attached',
        composerSpecSampleTitle: 'Sample Build Spec Sheet',
        composerPublishBtn: 'Publish Post',
        composerUploading: 'Uploading media…',
        composerSaving: 'Publishing…',
        composerAttachmentHint: 'Supports up to 4 photos (JPG/PNG/WebP) or 1 video (MP4/WebM), max 30 MB per file.',
        composerPublishedNotice: 'Your post has been published at the top of the feed.',
        composerTitleMinError: 'Post title must be at least 5 characters.',
        composerBodyMinError: 'Add at least 10 characters of detail so other members have clear context.',
        searchTabPosts: 'Posts',
        searchTabUsers: 'Members',
        searchHintPosts: 'Filter discussions by keyword, tag, or category',
        searchHintUsers: 'Find members to send a DM or view their posts',
        searchPlaceholderPosts: 'Search topics, hardware, or tags like #RTX4060',
        searchPlaceholderUsers: 'Search name or @username (e.g. Rizky, @bagas)…',
        searchClearAria: 'Clear search query',
        searchingUsers: 'Searching community members…',
        backToPosts: 'Back to Posts',
        usersNotFoundTitle: 'No members found',
        authorFilterPrefix: 'Showing posts by',
        showAllBtn: 'Show All',
        showingPrefix: 'Showing',
        showingUnit: 'posts',
        loadMoreBtn: 'Load more posts',
        emptyTitle: 'No posts match the active filters.',
        emptyDesc: 'Try a different keyword or category, or start a new discussion.',
        resetFilterBtn: 'Reset Filters',
        commentsLabel: 'Comments',
        shareBtn: 'Share',
        shareSpecsBtn: 'Share Specs',
        reportBtn: 'Report',
        reportPrompt: 'Report this post:',
        noComments: 'No comments yet. Be the first to reply.',
        replyPlaceholder: 'Write a reply or pick a GIF…',
        replySendAria: 'Send reply',
        specsHeader: 'Hardware Spec Breakdown',
        specsTotalLabel: 'Estimated build total',
        memberViewPosts: 'View Posts',
        memberProfile: 'Profile',
        memberSendDm: 'Message',
        sidebarContributors: 'Active Contributors',
        sidebarLikesUnit: 'likes',
        sidebarPostsUnit: 'posts',
        sidebarNoContributors: 'No contributor activity loaded yet.',
        sidebarGuides: 'Quick Guide Topics',
        sidebarTopTags: 'Trending Hardware Tags',
        sidebarNoTags: 'Tags appear automatically from community posts.',
      },
      aiConsultant: {
        eyebrow: 'ViciTech Toolkit',
        title: 'AI Build Consultant',
        desc: 'Plan your next PC build, evaluate laptop upgrade paths, and explore ViciTech services with our hardware consultant.',
        disclaimer: 'Device availability and pricing reflect the live ViciTech Market catalog when your consultation begins.',
      },
      feedback: {
        eyebrow: 'ViciTech OS User Validation',
        title: 'Feedback & Pilot Test Reports',
        desc: 'Help us refine Smart Preset Builder, Bottleneck Analyzer, Upgrade Analyzer, Market, and AI Consultant. Every submission directly shapes the ViciTech roadmap.',
        howProcessedTitle: 'How Is Feedback Processed?',
        privacyCardTitle: 'Personal Data Protection (UU PDP)',
        privacyCardCta: 'Read Cookie & Privacy Policy (UU PDP)',
      },
      cookies: {
        eyebrow: 'Indonesia Law No. 27/2022 (UU PDP) Compliance',
        title: 'Cookie & Personal Data Protection Policy',
        desc: 'ViciTech is committed to protecting personal data transparently in compliance with Indonesia Personal Data Protection Law No. 27 of 2022 (UU PDP). This page explains how we use cookies, process data, and safeguard your privacy rights.',
        dataRequestCta: 'Submit Data Request',
      },
    },
  },
};

import path from "node:path";

import { ExportKind, type Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { CreditPackButton } from "@/app/dashboard/credit-pack-button";
import { SubscribeButton } from "@/app/dashboard/subscribe-button";
import { createDesign, logoutUser, prepareDesign, savePrintifyConnection } from "@/app/user-actions";
import { getCreditBalance } from "@/lib/credits";
import { prisma } from "@/lib/db";
import { resolveEntitlements } from "@/lib/entitlements";
import { readStorageFile } from "@/lib/storage";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type DesignRecord = Prisma.DesignGetPayload<{
  include: {
    deviceProfile: true;
    exports: true;
  };
}>;

const DOWNLOAD_LABELS: Record<ExportKind, string> = {
  PRINT_FILE: "Print file",
  PREVIEW: "Preview",
  METADATA: "Metadata JSON",
  ZIP: "ZIP bundle",
};

const NAV_ITEMS = [
  { href: "#queue", label: "Queue", icon: "grid" },
  { href: "#composer", label: "Composer", icon: "spark" },
  { href: "#specs", label: "Specs", icon: "layers" },
  { href: "#commerce", label: "Commerce", icon: "wallet" },
  { href: "#connector", label: "Connector", icon: "plug" },
] as const;

const STORE_OPTIONS = [
  { value: "all", label: "All stores" },
  { value: "etsy", label: "Etsy" },
  { value: "ebay", label: "eBay" },
  { value: "amazon", label: "Amazon" },
] as const;

const DATE_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
] as const;

const TAG_OPTIONS = [
  { value: "high-margin", label: "High margin" },
  { value: "preview-ready", label: "Preview ready" },
  { value: "ready", label: "Ready" },
  { value: "low-res", label: "Low res" },
  { value: "needs-qa", label: "Needs QA" },
] as const;

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getMultiValue(value: string | string[] | undefined) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatCurrency(cents?: number | null) {
  if (typeof cents !== "number") {
    return "N/A";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatPercent(value?: number | null) {
  if (typeof value !== "number") {
    return "N/A";
  }

  return `${value.toFixed(1)}%`;
}

function formatShortDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function slugToLabel(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function getPhoneFamily(title: string) {
  const lower = title.toLowerCase();

  if (lower.includes("iphone")) {
    return "iphone";
  }

  if (lower.includes("samsung") || lower.includes("galaxy")) {
    return "samsung";
  }

  return "other";
}

function getCaseFamily(input: { title: string; parametersJson: Prisma.JsonValue | null }) {
  const payload = input.parametersJson;

  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const family = (payload as Record<string, unknown>).family;

    if (typeof family === "string" && family.length > 0) {
      return family;
    }
  }

  const lower = input.title.toLowerCase();

  if (lower.includes("clear case")) {
    return "clear-case";
  }

  if (lower.includes("tough case")) {
    return "tough-case";
  }

  return "standard-case";
}

function getDeviceParameter(design: DesignRecord, key: string) {
  const payload = design.deviceProfile.parametersJson;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "";
  }

  const value = (payload as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function getChannelPricing(design: DesignRecord, channel: "amazon" | "etsy" | "ebay") {
  const payload = design.deviceProfile.parametersJson;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }

  const pricingPayload = (payload as Record<string, unknown>).channelPricing;
  if (!pricingPayload || typeof pricingPayload !== "object" || Array.isArray(pricingPayload)) {
    return null;
  }

  const channelPayload = (pricingPayload as Record<string, unknown>)[channel];
  if (!channelPayload || typeof channelPayload !== "object" || Array.isArray(channelPayload)) {
    return null;
  }

  const typed = channelPayload as Record<string, unknown>;
  const priceCents = typeof typed.priceCents === "number" ? typed.priceCents : null;
  const feesCents = typeof typed.feesCents === "number" ? typed.feesCents : null;
  const profitCents = typeof typed.profitCents === "number" ? typed.profitCents : null;
  const marginPct = typeof typed.marginPct === "number" ? typed.marginPct : null;

  if (priceCents === null || feesCents === null || profitCents === null || marginPct === null) {
    return null;
  }

  return {
    priceCents,
    feesCents,
    profitCents,
    marginPct,
  };
}

function getSourcingMeta(design: DesignRecord) {
  return {
    manufacturer: getDeviceParameter(design, "manufacturer") || "Unknown",
    caseModel: getDeviceParameter(design, "caseModel") || slugToLabel(getCaseFamily(design.deviceProfile)),
    phoneModel: getDeviceParameter(design, "phoneModel") || design.deviceProfile.title,
    blueprintTitle: getDeviceParameter(design, "blueprintTitle") || "Unknown blueprint",
    printProviderTitle: getDeviceParameter(design, "printProviderTitle") || "Unknown provider",
  };
}

function getWorkflowState(design: DesignRecord) {
  if (design.status === "FAILED") {
    return "failed";
  }

  if (design.exports.length > 0 || design.status === "READY" || design.status === "EXPORTED") {
    return "completed";
  }

  return "active";
}

function getStatusMeta(design: DesignRecord) {
  const workflowState = getWorkflowState(design);

  if (workflowState === "failed") {
    return {
      label: "Failed",
      dotClassName: "bg-slate-500",
      textClassName: "text-slate-300",
    };
  }

  if (workflowState === "completed") {
    return {
      label: "Completed",
      dotClassName: "bg-emerald-400",
      textClassName: "text-emerald-200",
    };
  }

  return {
    label: "Active",
    dotClassName: "bg-sky-400",
    textClassName: "text-sky-200",
  };
}

function getWarnings(design: DesignRecord) {
  const payload = design.metadataJson;

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return [];
  }

  const warnings = (payload as Record<string, unknown>).warnings;

  if (!Array.isArray(warnings)) {
    return [];
  }

  return warnings.filter((warning): warning is string => typeof warning === "string");
}

function getDesignTags(design: DesignRecord) {
  const tags = new Set<string>();

  if ((design.deviceProfile.targetMarginPct || 0) >= 50) {
    tags.add("high-margin");
  }

  if (design.previewPath || design.exports.some((item) => item.kind === "PREVIEW")) {
    tags.add("preview-ready");
  }

  if (getWorkflowState(design) === "completed") {
    tags.add("ready");
  }

  if (getWarnings(design).length > 0) {
    tags.add("low-res");
  }

  if (getWorkflowState(design) !== "completed") {
    tags.add("needs-qa");
  }

  return Array.from(tags);
}

function getDesignScore(design: DesignRecord) {
  const margin = design.deviceProfile.targetMarginPct || 0;
  const warningPenalty = getWarnings(design).length > 0 ? 12 : 0;
  const completionBoost = design.exports.length > 0 ? 10 : 0;
  const readinessBoost = design.status === "READY" || design.status === "EXPORTED" ? 8 : 0;

  return clamp(62 + Math.round(margin / 4) + completionBoost + readinessBoost - warningPenalty, 48, 98);
}

function getOriginalityLabel(design: DesignRecord) {
  const uniqueTerms = new Set(
    design.title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  ).size;

  if (uniqueTerms >= 4 && getWarnings(design).length === 0) {
    return "High";
  }

  if (uniqueTerms >= 2) {
    return "Balanced";
  }

  return "Review";
}

function getReadinessLabel(design: DesignRecord) {
  if (design.status === "FAILED") {
    return "Attention needed";
  }

  if (design.exports.length > 0) {
    return "Ready to publish";
  }

  return "Needs export prep";
}

function getListingDescription(design: DesignRecord, selectedStore: string) {
  const storeLabel = STORE_OPTIONS.find((item) => item.value === selectedStore)?.label || "All stores";
  const caseLabel = slugToLabel(getCaseFamily(design.deviceProfile));
  const warnings = getWarnings(design);
  const readiness = getReadinessLabel(design);

  return [
    `${design.title} is staged as a ${caseLabel.toLowerCase()} workflow for ${design.deviceProfile.title}.`,
    `${readiness} with ${design.exports.length} export${design.exports.length === 1 ? "" : "s"} available for packaging and review.`,
    warnings[0]
      ? `Quality note: ${warnings[0]}`
      : `Outbound staging is tuned for ${storeLabel === "All stores" ? "channel-ready review" : storeLabel}.`,
  ].join(" ");
}

function matchesDateRange(date: Date, range: string) {
  if (range === "all") {
    return true;
  }

  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 0;

  if (!days) {
    return true;
  }

  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - days);

  return date >= windowStart;
}

function buildDashboardHref(
  params: Record<string, string | string[] | undefined>,
  updates: Record<string, string | string[] | null | undefined>,
) {
  const next = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    const entries = getMultiValue(value);

    entries.forEach((entry) => {
      if (entry) {
        next.append(key, entry);
      }
    });
  });

  Object.entries(updates).forEach(([key, value]) => {
    next.delete(key);

    if (!value) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry) {
          next.append(key, entry);
        }
      });

      return;
    }

    next.set(key, value);
  });

  const serialized = next.toString();
  return serialized ? `/dashboard?${serialized}` : "/dashboard";
}

async function getPreviewDataUrl(design: DesignRecord | null) {
  if (!design) {
    return null;
  }

  const relativePath = design.previewPath || design.originalPath;

  if (!relativePath) {
    return null;
  }

  try {
    const buffer = await readStorageFile(relativePath);
    const extension = path.extname(relativePath).toLowerCase();
    const contentType =
      extension === ".png"
        ? "image/png"
        : extension === ".webp"
          ? "image/webp"
          : "image/jpeg";

    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
}

function AppIcon({ name, className = "h-4 w-4" }: { name: string; className?: string }) {
  const strokeProps = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "grid":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect x="4" y="4" width="6" height="6" rx="1.5" {...strokeProps} />
          <rect x="14" y="4" width="6" height="6" rx="1.5" {...strokeProps} />
          <rect x="4" y="14" width="6" height="6" rx="1.5" {...strokeProps} />
          <rect x="14" y="14" width="6" height="6" rx="1.5" {...strokeProps} />
        </svg>
      );
    case "spark":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" {...strokeProps} />
        </svg>
      );
    case "layers":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M12 4l8 4-8 4-8-4 8-4z" {...strokeProps} />
          <path d="M4 12l8 4 8-4" {...strokeProps} />
          <path d="M4 16l8 4 8-4" {...strokeProps} />
        </svg>
      );
    case "wallet":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M4 7.5A2.5 2.5 0 016.5 5h10A2.5 2.5 0 0119 7.5v9A2.5 2.5 0 0116.5 19h-10A2.5 2.5 0 014 16.5v-9z" {...strokeProps} />
          <path d="M15 12h5" {...strokeProps} />
          <circle cx="15.5" cy="12" r=".8" fill="currentColor" />
        </svg>
      );
    case "plug":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M9 3v6" {...strokeProps} />
          <path d="M15 3v6" {...strokeProps} />
          <path d="M7 9h10v2a5 5 0 01-5 5 5 5 0 01-5-5V9z" {...strokeProps} />
          <path d="M12 16v5" {...strokeProps} />
        </svg>
      );
    case "search":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <circle cx="11" cy="11" r="6" {...strokeProps} />
          <path d="M20 20l-4.2-4.2" {...strokeProps} />
        </svg>
      );
    case "arrow-right":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path d="M5 12h14" {...strokeProps} />
          <path d="M13 6l6 6-6 6" {...strokeProps} />
        </svg>
      );
    case "case":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect x="7.5" y="2.5" width="9" height="19" rx="3" {...strokeProps} />
          <path d="M10 6.5h4" {...strokeProps} />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="8" {...strokeProps} />
        </svg>
      );
  }
}

function FilterSelect({
  name,
  label,
  options,
  value,
}: {
  name: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  value: string;
}) {
  return (
    <label className="chip-field min-w-[126px]">
      <span className="chip-label">{label}</span>
      <div className="relative">
        <select name={name} defaultValue={value} className="chip-select pr-8">
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[var(--muted)]">
          <AppIcon name="arrow-right" className="h-3.5 w-3.5 rotate-90" />
        </span>
      </div>
    </label>
  );
}

export default async function DashboardPage({ searchParams }: Props) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const params = await searchParams;

  const [user, deviceProfiles, designs, creditBalance, plans, jobSpecs, creditPacks] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        subscriptions: {
          include: {
            plan: true,
          },
          orderBy: {
            updatedAt: "desc",
          },
          take: 1,
        },
        printifyConnection: true,
      },
    }),
    prisma.deviceProfile.findMany({
      where: { enabled: true },
      orderBy: { title: "asc" },
    }),
    prisma.design.findMany({
      where: { userId: session.user.id },
      include: {
        deviceProfile: true,
        exports: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    getCreditBalance(session.user.id),
    prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { amountCents: "asc" },
    }),
    prisma.jobSpec.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.creditPack.findMany({
      where: { isActive: true },
      orderBy: { credits: "asc" },
    }),
  ]);

  if (!user) {
    redirect("/sign-in");
  }

  const latestSubscription = user.subscriptions[0] || null;
  const entitlements = resolveEntitlements(latestSubscription || null);
  const canUsePaidFeatures = entitlements.canAccessApp;
  const query = getSingleValue(params.q)?.trim() || "";
  const view = getSingleValue(params.view) === "completed" ? "completed" : "active";
  const selectedCaseType = getSingleValue(params.caseType) || "all";
  const selectedStatus = getSingleValue(params.status) || "all";
  const selectedStore = getSingleValue(params.store) || "all";
  const selectedPhoneType = getSingleValue(params.phone) || "all";
  const selectedRange = getSingleValue(params.range) || "all";
  const selectedTags = getMultiValue(params.tag);
  const selectedDesignId = getSingleValue(params.selected) || "";

  const caseTypeOptions = [
    { value: "all", label: "All case types" },
    ...Array.from(
      new Set(deviceProfiles.map((profile) => getCaseFamily(profile)).filter(Boolean)),
    ).map((value) => ({
      value,
      label: slugToLabel(value),
    })),
  ];

  const phoneOptions = [
    { value: "all", label: "All phones" },
    ...Array.from(
      new Set(deviceProfiles.map((profile) => getPhoneFamily(profile.title)).filter((value) => value !== "other")),
    ).map((value) => ({
      value,
      label: slugToLabel(value),
    })),
  ];

  const filteredDesigns = designs.filter((design) => {
    const workflowState = getWorkflowState(design);
    const tags = getDesignTags(design);
    const searchable = [
      design.title,
      design.id,
      design.deviceProfile.title,
      slugToLabel(getCaseFamily(design.deviceProfile)),
    ]
      .join(" ")
      .toLowerCase();

    const matchesQuery = !query || searchable.includes(query.toLowerCase());
    const matchesCaseType =
      selectedCaseType === "all" || getCaseFamily(design.deviceProfile) === selectedCaseType;
    const matchesPhoneType =
      selectedPhoneType === "all" || getPhoneFamily(design.deviceProfile.title) === selectedPhoneType;
    const matchesRange = matchesDateRange(design.createdAt, selectedRange);
    const matchesTags = selectedTags.every((tag) => tags.includes(tag));
    const matchesStatus =
      selectedStatus === "all"
        ? view === "completed"
          ? workflowState === "completed"
          : workflowState !== "completed"
        : workflowState === selectedStatus;

    return matchesQuery && matchesCaseType && matchesPhoneType && matchesRange && matchesTags && matchesStatus;
  });

  const selectedDesign =
    filteredDesigns.find((design) => design.id === selectedDesignId) ||
    filteredDesigns[0] ||
    designs[0] ||
    null;

  const previewDataUrl = await getPreviewDataUrl(selectedDesign);

  const selectedIndex = filteredDesigns.findIndex((design) => design.id === selectedDesign?.id);
  const nextDesign =
    filteredDesigns.length > 0
      ? filteredDesigns[(selectedIndex >= 0 ? selectedIndex + 1 : 0) % filteredDesigns.length]
      : null;

  const notice =
    getSingleValue(params.error)
      ? decodeURIComponent(getSingleValue(params.error) || "")
      : getSingleValue(params.created)
        ? "Source artwork uploaded and queued."
        : getSingleValue(params.creditsPurchased)
          ? "Credit pack applied to your workspace balance."
          : getSingleValue(params.connected)
            ? "Printify connection validated and saved."
            : getSingleValue(params.prepared)
              ? "Selected case prepared with fresh exports."
              : "";

  const activeCount = designs.filter((design) => getWorkflowState(design) === "active").length;
  const completedCount = designs.filter((design) => getWorkflowState(design) === "completed").length;
  const failedCount = designs.filter((design) => getWorkflowState(design) === "failed").length;
  const score = selectedDesign ? getDesignScore(selectedDesign) : null;
  const description = selectedDesign ? getListingDescription(selectedDesign, selectedStore) : "";

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-4 text-[var(--foreground)] sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.14),transparent_28%),linear-gradient(180deg,#030816_0%,#08101d_52%,#050913_100%)]" />

      <section className="master-panel relative mx-auto grid h-[calc(100vh-2rem)] max-h-[980px] w-full max-w-[1580px] grid-cols-[220px_minmax(0,1fr)_340px] grid-rows-[104px_minmax(0,1fr)] overflow-hidden rounded-[24px]">
        <aside className="flex min-h-0 flex-col border-r border-[var(--divider)] bg-[linear-gradient(180deg,rgba(8,17,32,0.92)_0%,rgba(6,14,27,0.84)_100%)] px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,rgba(56,189,248,0.28),rgba(14,165,233,0.1))] text-sky-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]">
              <AppIcon name="case" className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.34em] text-[var(--muted)]">Production OS</p>
              <h1 className="text-base font-semibold tracking-[0.02em]">Case Creator</h1>
            </div>
          </div>

          <div className="mt-8 space-y-1">
            {NAV_ITEMS.map((item, index) => (
              <a
                key={item.label}
                href={item.href}
                className={`nav-item ${index === 0 ? "nav-item-active" : ""}`}
              >
                <AppIcon name={item.icon} className="h-4 w-4" />
                <span>{item.label}</span>
              </a>
            ))}
          </div>

          <div className="mt-8 space-y-5 text-sm">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Operator</p>
              <p className="mt-2 text-sm font-medium text-white">{user.name || user.email}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{user.email}</p>
            </div>
            <div className="space-y-3 border-y border-[var(--divider)] py-5">
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">Status</span>
                <span className="font-medium text-white">{user.status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">Plan</span>
                <span className="font-medium text-white">{latestSubscription?.plan.name || "None"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">Access</span>
                <span className={`font-medium ${canUsePaidFeatures ? "text-emerald-200" : "text-amber-200"}`}>
                  {canUsePaidFeatures ? "Unlocked" : "Paywall active"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--muted)]">Credits</span>
                <span className="font-medium text-white">{creditBalance}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[var(--muted)]">Printify</span>
                <span className="text-right font-medium text-white">
                  {user.printifyConnection?.shopName || "Not connected"}
                </span>
              </div>
            </div>
            {user.role === "ADMIN" ? (
              <Link href="/admin/launch-settings" className="secondary-action w-full justify-center">
                Launch settings
              </Link>
            ) : null}
          </div>

          <div className="mt-auto space-y-4">
            <div className="rounded-[20px] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Queue health</p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Active</span>
                  <span className="font-medium text-sky-200">{activeCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Completed</span>
                  <span className="font-medium text-emerald-200">{completedCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--muted)]">Failed</span>
                  <span className="font-medium text-slate-300">{failedCount}</span>
                </div>
              </div>
            </div>

            <form action={logoutUser}>
              <button type="submit" className="secondary-action w-full justify-center">
                Sign out
              </button>
            </form>
          </div>
        </aside>

        <section className="col-span-2 flex items-center gap-5 border-b border-[var(--divider)] px-6 py-5">
          <form action="/dashboard" className="grid flex-1 grid-cols-[minmax(360px,0.46fr)_minmax(0,1fr)] gap-4">
            <input type="hidden" name="view" value={view} />
            <input type="hidden" name="selected" value={selectedDesign?.id || ""} />

            <label className="relative block">
              <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sky-200">
                <AppIcon name="search" className="h-4.5 w-4.5" />
              </span>
              <input
                name="q"
                type="search"
                defaultValue={query}
                placeholder="Search cases, IDs, or keywords..."
                className="command-search h-14 w-full rounded-[18px] pl-12 pr-4 text-sm"
              />
            </label>

            <div className="flex flex-col justify-center gap-3">
              <div className="flex flex-wrap gap-2">
                <FilterSelect
                  name="caseType"
                  label="Case Type"
                  options={caseTypeOptions}
                  value={selectedCaseType}
                />
                <FilterSelect
                  name="status"
                  label="Status"
                  options={[
                    { value: "all", label: "All statuses" },
                    { value: "active", label: "Active" },
                    { value: "completed", label: "Completed" },
                    { value: "failed", label: "Failed" },
                  ]}
                  value={selectedStatus}
                />
                <FilterSelect name="store" label="Store" options={STORE_OPTIONS.slice()} value={selectedStore} />
                <FilterSelect name="phone" label="Phone type" options={phoneOptions} value={selectedPhoneType} />
                <FilterSelect name="range" label="Date range" options={DATE_OPTIONS.slice()} value={selectedRange} />
                <button type="submit" className="chip-submit">
                  Apply
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {TAG_OPTIONS.map((tag) => (
                  <label key={tag.value} className="tag-chip">
                    <input
                      type="checkbox"
                      name="tag"
                      value={tag.value}
                      defaultChecked={selectedTags.includes(tag.value)}
                      className="peer sr-only"
                    />
                    <span className="tag-chip-label">{tag.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </form>

          <div className="flex items-center gap-2 border-l border-[var(--divider)] pl-5">
            <Link href="/dashboard" className="secondary-action">
              Reset
            </Link>
            <Link
              href={`${buildDashboardHref(params, { selected: selectedDesign?.id || undefined })}#composer`}
              className="secondary-action"
            >
              Draft
            </Link>
            <form action={prepareDesign}>
              <input type="hidden" name="designId" value={selectedDesign?.id || ""} />
              <button type="submit" disabled={!selectedDesign || !canUsePaidFeatures} className="primary-action">
                Publish
              </button>
            </form>
            <Link
              href={buildDashboardHref(params, { selected: nextDesign?.id || selectedDesign?.id || undefined })}
              className="accent-action"
            >
              Send Next Case
            </Link>
          </div>
        </section>

        <section id="queue" className="flex min-h-0 flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-[var(--divider)] px-6 py-4">
            <div className="flex items-center gap-3">
              <Link
                href={buildDashboardHref(params, { view: "active", status: selectedStatus === "all" ? undefined : selectedStatus })}
                className={`workspace-toggle ${view === "active" ? "workspace-toggle-active" : ""}`}
              >
                ACTIVE
                <span className="ml-2 text-[var(--muted)]">{activeCount + failedCount}</span>
              </Link>
              <Link
                href={buildDashboardHref(params, { view: "completed", status: selectedStatus === "all" ? undefined : selectedStatus })}
                className={`workspace-toggle ${view === "completed" ? "workspace-toggle-active" : ""}`}
              >
                COMPLETED
                <span className="ml-2 text-[var(--muted)]">{completedCount}</span>
              </Link>
              {selectedStore !== "all" ? (
                <span className="inline-flex items-center rounded-full bg-[rgba(59,130,246,0.12)] px-3 py-1 text-xs font-medium text-sky-100">
                  {STORE_OPTIONS.find((item) => item.value === selectedStore)?.label}
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-4 text-sm text-[var(--muted)]">
              <span>{filteredDesigns.length} cases in view</span>
              <Link href="/api/health" className="text-sky-200 transition hover:text-white">
                Health check
              </Link>
            </div>
          </div>

          {!canUsePaidFeatures ? (
            <div className="border-b border-amber-500/35 bg-[linear-gradient(90deg,rgba(245,158,11,0.2),rgba(15,23,42,0))] px-6 py-3 text-sm text-amber-100">
              Paywall is active. Start a subscription below to unlock uploads, exports, AI, and Printify.
            </div>
          ) : null}
          {notice ? (
            <div className="border-b border-[var(--divider)] bg-[linear-gradient(90deg,rgba(56,189,248,0.12),rgba(15,23,42,0))] px-6 py-3 text-sm text-sky-100">
              {notice}
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
            {filteredDesigns.length === 0 ? (
              <div className="flex h-full min-h-[280px] items-center justify-center px-8 text-center text-sm text-[var(--muted)]">
                No cases match the current search and filters. Reset the command bar to bring the full queue back into view.
              </div>
            ) : (
              <table className="w-full border-separate border-spacing-y-2 text-left">
                <thead>
                  <tr className="text-[11px] uppercase tracking-[0.26em] text-[var(--muted)]">
                    <th className="px-4 pb-2 pt-4 font-medium">Case</th>
                    <th className="px-3 pb-2 pt-4 font-medium">Phone</th>
                    <th className="px-3 pb-2 pt-4 font-medium">Channel</th>
                    <th className="px-3 pb-2 pt-4 font-medium">Created</th>
                    <th className="px-3 pb-2 pt-4 font-medium">Status</th>
                    <th className="px-3 pb-2 pt-4 font-medium">Outputs</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDesigns.map((design) => {
                    const statusMeta = getStatusMeta(design);
                    const tags = getDesignTags(design).slice(0, 3);
                    const isSelected = selectedDesign?.id === design.id;

                    return (
                      <tr
                        key={design.id}
                        className={`table-row ${isSelected ? "table-row-selected" : ""}`}
                      >
                        <td className="rounded-l-[18px] px-4 py-4">
                          <Link
                            href={buildDashboardHref(params, { selected: design.id })}
                            className="flex flex-col gap-2"
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,rgba(59,130,246,0.18),rgba(14,165,233,0.08))] text-sky-100">
                                <AppIcon name="case" className="h-4.5 w-4.5" />
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-white">{design.title}</p>
                                <p className="mt-1 text-xs text-[var(--muted)]">
                                  {design.id.slice(0, 8)} • {slugToLabel(getCaseFamily(design.deviceProfile))}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 pl-14">
                              {tags.map((tag) => (
                                <span key={tag} className="mini-tag">
                                  {slugToLabel(tag)}
                                </span>
                              ))}
                            </div>
                          </Link>
                        </td>
                        <td className="px-3 py-4 text-sm text-slate-200">{design.deviceProfile.title}</td>
                        <td className="px-3 py-4 text-sm text-[var(--muted)]">
                          {user.printifyConnection?.shopName || "Manual export"}
                        </td>
                        <td className="px-3 py-4 text-sm text-[var(--muted)]">{formatShortDate(design.createdAt)}</td>
                        <td className="px-3 py-4 text-sm">
                          <span className={`inline-flex items-center gap-2 ${statusMeta.textClassName}`}>
                            <span className={`h-2.5 w-2.5 rounded-full ${statusMeta.dotClassName}`} />
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="rounded-r-[18px] px-3 py-4 text-sm text-[var(--muted)]">
                          {design.exports.length > 0 ? `${design.exports.length} ready` : "Queued"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="grid shrink-0 border-t border-[var(--divider)] xl:grid-cols-[1.1fr_0.82fr_0.9fr]">
            <section id="composer" className="space-y-4 px-6 py-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Draft composer</p>
                <h2 className="mt-2 text-lg font-semibold text-white">Add a new case to the line</h2>
              </div>
              <form action={createDesign} className="grid gap-3 md:grid-cols-[1.1fr_0.9fr]">
                <input
                  name="title"
                  type="text"
                  placeholder="Design title"
                  className="field-dark md:col-span-2"
                  disabled={!canUsePaidFeatures}
                  required
                />
                <select
                  name="deviceProfileId"
                  className="field-dark"
                  defaultValue=""
                  disabled={!canUsePaidFeatures}
                  required
                >
                  <option disabled value="">
                    Choose a device profile
                  </option>
                  {deviceProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.title}
                    </option>
                  ))}
                </select>
                <input
                  name="artwork"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="field-dark file:mr-4 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--foreground)] hover:file:bg-white/15"
                  disabled={!canUsePaidFeatures}
                  required
                />
                <button
                  type="submit"
                  disabled={!canUsePaidFeatures}
                  className="primary-action justify-center md:col-span-2"
                >
                  Upload source artwork
                </button>
              </form>
              {!canUsePaidFeatures ? (
                <p className="text-sm leading-7 text-amber-200">
                  An active subscription is required to upload, export, and publish designs.
                </p>
              ) : null}
              <p className="text-sm leading-7 text-[var(--muted)]">
                The server still generates the same curated print PNG, preview JPG, metadata JSON, and ZIP bundle. This workspace just frames that pipeline as a tighter production flow.
              </p>
            </section>

            <section id="specs" className="space-y-4 border-t border-[var(--divider)] px-6 py-5 xl:border-l xl:border-t-0">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Job specs</p>
                <h2 className="mt-2 text-lg font-semibold text-white">Recent handoff contracts</h2>
              </div>
              <div className="space-y-3">
                {jobSpecs.length === 0 ? (
                  <p className="text-sm leading-7 text-[var(--muted)]">
                    No job specs generated yet. The handoff list will populate here as idea and spec flows are used.
                  </p>
                ) : (
                  jobSpecs.map((jobSpec) => (
                    <div key={jobSpec.id} className="flex items-start justify-between gap-4 border-b border-[var(--divider)] pb-3 last:border-b-0 last:pb-0">
                      <div>
                        <p className="text-sm font-medium text-white">{jobSpec.title}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">{formatLongDate(jobSpec.updatedAt)}</p>
                      </div>
                      <span className="rounded-full bg-[rgba(255,255,255,0.05)] px-3 py-1 text-xs font-medium text-slate-200">
                        {jobSpec.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            <section id="commerce" className="space-y-5 border-t border-[var(--divider)] px-6 py-5 xl:border-l xl:border-t-0">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Commerce</p>
                <h2 className="mt-2 text-lg font-semibold text-white">Plans and credit packs</h2>
              </div>
              {!canUsePaidFeatures ? (
                <p className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                  Subscription inactive. Start a plan to unlock uploads, exports, AI, and Printify actions.
                </p>
              ) : null}
              <div className="space-y-4">
                {plans.map((plan) => (
                  <div key={plan.id} className="border-b border-[var(--divider)] pb-4 last:border-b-0 last:pb-0">
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-white">{plan.name}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {plan.includedCredits} monthly credits
                        </p>
                      </div>
                      <span className="text-sm font-medium text-slate-100">{formatCurrency(plan.amountCents)}/mo</span>
                    </div>
                    <SubscribeButton
                      planCode={plan.code}
                      label={`Start ${plan.name}`}
                    />
                  </div>
                ))}
                {canUsePaidFeatures ? (
                  <p className="text-xs text-emerald-200">Need more usage? Top up with credit packs below.</p>
                ) : null}
                {creditPacks.map((pack) => (
                  <div key={pack.id} className="border-b border-[var(--divider)] pb-4 last:border-b-0 last:pb-0">
                    <div className="mb-3 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-white">{pack.name}</p>
                        <p className="mt-1 text-xs text-[var(--muted)]">{pack.credits} credits</p>
                      </div>
                      <span className="text-sm font-medium text-slate-100">{formatCurrency(pack.amountCents)}</span>
                    </div>
                    <CreditPackButton
                      packCode={pack.code}
                      label={`Buy ${pack.credits} credits`}
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>

        <aside className="min-h-0 overflow-auto border-l border-[var(--divider)] bg-[linear-gradient(180deg,rgba(8,15,28,0.58),rgba(6,11,22,0.78))]">
          <div className="space-y-6 px-6 py-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Inspector</p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                {selectedDesign ? selectedDesign.title : "No case selected"}
              </h2>
              <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
                {selectedDesign
                  ? `Focused review for ${selectedDesign.deviceProfile.title}.`
                  : "Select a case in the queue to preview metadata, exports, and readiness."}
              </p>
            </div>

            <div className="inspector-preview overflow-hidden rounded-[22px]">
              {previewDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewDataUrl}
                  alt={selectedDesign?.title || "Case preview"}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full min-h-[280px] items-center justify-center px-8 text-center">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.3em] text-sky-200/70">Preview pending</p>
                    <p className="mt-3 text-lg font-medium text-white">
                      {selectedDesign?.deviceProfile.title || "Awaiting selection"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-[20px] bg-[rgba(255,255,255,0.03)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
              <div className="grid grid-cols-2 gap-px bg-[var(--divider)]">
                {[
                  { label: "Code", value: selectedDesign ? selectedDesign.id.slice(0, 8).toUpperCase() : "N/A" },
                  { label: "Score", value: score ? `${score}/100` : "N/A" },
                  { label: "Readiness", value: selectedDesign ? getReadinessLabel(selectedDesign) : "N/A" },
                  { label: "Originality", value: selectedDesign ? getOriginalityLabel(selectedDesign) : "N/A" },
                ].map((item) => (
                  <div key={item.label} className="bg-[rgba(9,17,30,0.92)] px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">{item.label}</p>
                    <p className="mt-2 text-sm font-medium text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {selectedDesign ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Exports</p>
                  <form action={prepareDesign}>
                    <input type="hidden" name="designId" value={selectedDesign.id} />
                    <button type="submit" disabled={!canUsePaidFeatures} className="secondary-action">
                      Prepare exports
                    </button>
                  </form>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedDesign.exports.length > 0 ? (
                    selectedDesign.exports.map((exportItem) =>
                      canUsePaidFeatures ? (
                        <Link
                          key={exportItem.id}
                          href={`/api/designs/${selectedDesign.id}/download?kind=${exportItem.kind}`}
                          className="download-pill"
                        >
                          {DOWNLOAD_LABELS[exportItem.kind as ExportKind]}
                        </Link>
                      ) : (
                        <span key={exportItem.id} className="download-pill opacity-60">
                          {DOWNLOAD_LABELS[exportItem.kind as ExportKind]}
                        </span>
                      ),
                    )
                  ) : (
                    <span className="text-sm text-[var(--muted)]">No exports generated yet.</span>
                  )}
                </div>
              </div>
            ) : null}

            {selectedDesign ? (
              <div className="space-y-4 border-t border-[var(--divider)] pt-5">
                <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Sourcing</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {(() => {
                    const sourcing = getSourcingMeta(selectedDesign);
                    return (
                      <>
                        <div className="rounded-xl bg-[rgba(255,255,255,0.03)] px-3 py-2">
                          <p className="text-xs text-[var(--muted)]">Manufacturer</p>
                          <p className="mt-1 text-slate-100">{slugToLabel(sourcing.manufacturer)}</p>
                        </div>
                        <div className="rounded-xl bg-[rgba(255,255,255,0.03)] px-3 py-2">
                          <p className="text-xs text-[var(--muted)]">Case model</p>
                          <p className="mt-1 text-slate-100">{slugToLabel(sourcing.caseModel)}</p>
                        </div>
                        <div className="rounded-xl bg-[rgba(255,255,255,0.03)] px-3 py-2">
                          <p className="text-xs text-[var(--muted)]">Phone model</p>
                          <p className="mt-1 text-slate-100">{slugToLabel(sourcing.phoneModel)}</p>
                        </div>
                        <div className="rounded-xl bg-[rgba(255,255,255,0.03)] px-3 py-2">
                          <p className="text-xs text-[var(--muted)]">Base cost</p>
                          <p className="mt-1 text-slate-100">{formatCurrency(selectedDesign.deviceProfile.baseCostCents)}</p>
                        </div>
                        <div className="rounded-xl bg-[rgba(255,255,255,0.03)] px-3 py-2">
                          <p className="text-xs text-[var(--muted)]">Blueprint</p>
                          <p className="mt-1 text-slate-100">{sourcing.blueprintTitle}</p>
                        </div>
                        <div className="rounded-xl bg-[rgba(255,255,255,0.03)] px-3 py-2">
                          <p className="text-xs text-[var(--muted)]">Print provider</p>
                          <p className="mt-1 text-slate-100">{sourcing.printProviderTitle}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            ) : null}

            {selectedDesign ? (
              <div className="space-y-4 border-t border-[var(--divider)] pt-5">
                <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Marketplace pricing</p>
                <div className="space-y-2">
                  {(["amazon", "etsy", "ebay"] as const).map((channel) => {
                    const channelPricing = getChannelPricing(selectedDesign, channel);
                    return (
                      <div
                        key={channel}
                        className="rounded-xl border border-[var(--divider)] bg-[rgba(255,255,255,0.02)] px-3 py-3 text-sm"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <p className="font-medium text-slate-100">{slugToLabel(channel)}</p>
                          <p className="text-slate-200">
                            {channelPricing ? formatCurrency(channelPricing.priceCents) : "N/A"}
                          </p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs text-[var(--muted)]">
                          <div>
                            <p>Fees</p>
                            <p className="mt-1 text-slate-200">
                              {channelPricing ? formatCurrency(channelPricing.feesCents) : "N/A"}
                            </p>
                          </div>
                          <div>
                            <p>Profit</p>
                            <p className="mt-1 text-slate-200">
                              {channelPricing ? formatCurrency(channelPricing.profitCents) : "N/A"}
                            </p>
                          </div>
                          <div>
                            <p>Margin</p>
                            <p className="mt-1 text-slate-200">
                              {channelPricing ? formatPercent(channelPricing.marginPct) : "N/A"}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="space-y-3 border-t border-[var(--divider)] pt-5">
              <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Listing description</p>
              <p className="text-sm leading-7 text-slate-200">{description || "A selected case will render its listing-ready summary here."}</p>
            </div>

            <div id="connector" className="space-y-4 border-t border-[var(--divider)] pt-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">Store connector</p>
                <h3 className="mt-2 text-lg font-semibold text-white">Printify connection</h3>
              </div>
              <form action={savePrintifyConnection} className="space-y-3">
                <input
                  name="apiToken"
                  type="password"
                  placeholder="Printify personal access token"
                  className="field-dark"
                  disabled={!canUsePaidFeatures}
                  required
                />
                <input
                  name="shopId"
                  type="text"
                  placeholder="Printify shop ID"
                  defaultValue={user.printifyConnection?.shopId || ""}
                  className="field-dark"
                  disabled={!canUsePaidFeatures}
                  required
                />
                <button
                  type="submit"
                  disabled={!canUsePaidFeatures}
                  className="primary-action w-full justify-center"
                >
                  Save and validate Printify
                </button>
              </form>
              <p className="text-sm leading-7 text-[var(--muted)]">
                OAuth stays postponed for now. This build still uses the same validated token plus shop ID flow already wired on the server.
              </p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

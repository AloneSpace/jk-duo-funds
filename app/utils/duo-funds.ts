import type { DateRangePreset, DateRangeSelection } from "~/types/duo-funds";

const currencyFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
});

const dateTimeFormatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
});

export const formatCurrency = (value: number) =>
  currencyFormatter.format(value);

export const formatDate = (value: string) =>
  dateFormatter.format(new Date(value));

export const formatDateTime = (value: string) =>
  dateTimeFormatter.format(new Date(value));

export const toDateInputValue = (value = new Date()) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export const toTimeInputValue = (value = new Date()) => {
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");

  return `${hours}:${minutes}`;
};

export const normalizePairCode = (value: string) =>
  value.trim().toUpperCase().replace(/\s+/g, "-");

export const getPresetDateRange = (
  preset: DateRangePreset,
  now = new Date(),
): DateRangeSelection => {
  if (preset === "all") {
    return { from: null, to: null };
  }

  const end = new Date(now);
  const start = new Date(now);

  if (preset === "7d") {
    start.setDate(end.getDate() - 6);
  } else if (preset === "30d") {
    start.setDate(end.getDate() - 29);
  } else {
    start.setDate(1);
    end.setMonth(end.getMonth() + 1, 0);
  }

  return {
    from: toDateInputValue(start),
    to: toDateInputValue(end),
  };
};

export const isWithinDateRange = (
  value: string,
  preset: DateRangePreset,
  customRange: DateRangeSelection = { from: null, to: null },
  now = new Date(),
) => {
  const candidate = toDateInputValue(new Date(value));
  const range =
    preset === "all" ? customRange : getPresetDateRange(preset, now);

  if (!range.from && !range.to) {
    return true;
  }

  if (range.from && candidate < range.from) {
    return false;
  }

  if (range.to && candidate > range.to) {
    return false;
  }

  return true;
};

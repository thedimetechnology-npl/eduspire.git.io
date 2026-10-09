import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export const formatDate = (d, fmt = "MMM D, YYYY") => (d ? dayjs(d).format(fmt) : "");
export const formatDateTime = (d) => (d ? dayjs(d).format("MMM D, YYYY · h:mm A") : "");
export const fromNow = (d) => (d ? dayjs(d).fromNow() : "");

export const formatCurrency = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n || 0));

export const initials = (name = "") =>
  name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

export const roleLabel = (role) => ({ student: "Student", teacher: "Teacher", admin: "Administrator" })[role] || role;

export const levelLabel = (level) => ({ beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" })[level] || level;

export function extractErrorMessage(error) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((d) => d.msg).join(", ");
  return error?.message || "Something went wrong. Please try again.";
}

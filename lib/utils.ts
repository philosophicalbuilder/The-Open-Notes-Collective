import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format as dateFormat, formatDistanceToNow } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format date for display (e.g., "Nov 28, 2025")
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return dateFormat(d, 'MMM d, yyyy');
}

// Format time (e.g., "2:30 PM") - re-export date-fns format
export { dateFormat as format };

// Format relative time (e.g., "2 days ago")
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

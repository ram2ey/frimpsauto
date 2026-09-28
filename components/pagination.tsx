import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize?: number;
  baseUrl: string;
  searchParams?: Record<string, string | undefined>;
}

function buildPageUrl(baseUrl: string, params: Record<string, string | undefined>, targetPage: number) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v && k !== "page") {
      sp.set(k, v);
    }
  }
  if (targetPage > 1) {
    sp.set("page", String(targetPage));
  }
  const query = sp.toString();
  return query ? `${baseUrl}?${query}` : baseUrl;
}

export function Pagination({
  page,
  totalPages,
  totalCount,
  pageSize = 25,
  baseUrl,
  searchParams = {},
}: PaginationProps) {
  if (totalCount === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="pagination-wrap">
      <div className="pagination-info">
        Showing <strong>{start}</strong>–<strong>{end}</strong> of <strong>{totalCount}</strong>
      </div>
      <div className="pagination-controls">
        {hasPrev ? (
          <Link
            href={buildPageUrl(baseUrl, searchParams, page - 1)}
            className="btn btn-secondary btn-small"
            aria-label="Previous page"
          >
            <ChevronLeft size={15} /> Previous
          </Link>
        ) : (
          <span className="btn btn-secondary btn-small disabled" aria-disabled="true">
            <ChevronLeft size={15} /> Previous
          </span>
        )}

        <span className="pagination-page-indicator">
          Page <strong>{page}</strong> of <strong>{totalPages}</strong>
        </span>

        {hasNext ? (
          <Link
            href={buildPageUrl(baseUrl, searchParams, page + 1)}
            className="btn btn-secondary btn-small"
            aria-label="Next page"
          >
            Next <ChevronRight size={15} />
          </Link>
        ) : (
          <span className="btn btn-secondary btn-small disabled" aria-disabled="true">
            Next <ChevronRight size={15} />
          </span>
        )}
      </div>
    </div>
  );
}

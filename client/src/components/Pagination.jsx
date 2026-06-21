export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  const pages = [];
  const maxVisible = 5;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  let end = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-center gap-1.5 pt-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        className="px-2.5 py-1.5 text-xs text-text-secondary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition rounded-lg hover:bg-surface-2"
      >
        Prev
      </button>
      {start > 1 && (
        <>
          <button onClick={() => onPageChange(1)} className="w-7 h-7 text-xs text-text-secondary hover:text-white hover:bg-surface-2 rounded-lg transition">1</button>
          {start > 2 && <span className="text-text-muted text-xs px-1">...</span>}
        </>
      )}
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onPageChange(p)}
          className={`w-7 h-7 text-xs rounded-lg transition font-medium ${p === page ? 'bg-white text-black' : 'text-text-secondary hover:text-white hover:bg-surface-2'}`}
        >
          {p}
        </button>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="text-text-muted text-xs px-1">...</span>}
          <button onClick={() => onPageChange(totalPages)} className="w-7 h-7 text-xs text-text-secondary hover:text-white hover:bg-surface-2 rounded-lg transition">{totalPages}</button>
        </>
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages}
        className="px-2.5 py-1.5 text-xs text-text-secondary hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition rounded-lg hover:bg-surface-2"
      >
        Next
      </button>
    </div>
  );
}
/**
 * Builds a MongoDB query+options object from Express query params.
 *
 * Supports:
 *  - page, limit (pagination)
 *  - sort (e.g. "createdAt:-1")
 *  - search (text search across provided fields)
 *  - arbitrary filter params passed via `filters` object
 */
export function buildQuery(req, { searchFields = [], extraFilters = {}, defaultSort = { createdAt: -1 } } = {}) {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  // Sort
  let sort = defaultSort;
  if (req.query.sort) {
    const [field, dir] = req.query.sort.split(':');
    sort = { [field]: parseInt(dir, 10) || 1 };
  }

  // Search
  const filters = { ...extraFilters };
  if (req.query.search && searchFields.length > 0) {
    const term = req.query.search.trim();
    filters.$or = searchFields.map((f) => ({
      [f]: { $regex: term, $options: 'i' },
    }));
  }

  // Pass-through simple filters: status=Won, role=producer, etc.
  const passthrough = req.query.filter || {};
  Object.assign(filters, passthrough);

  return {
    filters,
    options: { sort, skip, limit },
    page,
    limit,
    skip,
  };
}

export function paginateResults(docs, total, page, limit) {
  return {
    data: docs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 0,
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

export function sendPaginated(res, docs, total, page, limit) {
  return res.json(paginateResults(docs, total, page, limit));
}

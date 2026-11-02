import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, SearchX, SlidersHorizontal, X } from 'lucide-react'
import { useCategories, useProducts } from '../hooks/useCatalog'
import ProductCard from '../components/ProductCard'

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryIdParam = searchParams.get('category')
  const categoryId = categoryIdParam ? Number(categoryIdParam) : undefined
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('')
  const [showFilter, setShowFilter] = useState(false)

  const { data: categories } = useCategories()
  const { data: products, isLoading } = useProducts({ categoryId, search: search || undefined })

  let displayed = products ?? []
  // Out-of-stock products sink to the bottom of the list.
  const statusRank = (p: { stock: number; lowStock: boolean }) =>
    p.stock <= 0 ? 2 : p.lowStock ? 1 : 0
  if (sort === 'price-asc') {
    displayed = [...displayed].sort((a, b) => statusRank(a) - statusRank(b) || a.price - b.price)
  } else if (sort === 'price-desc') {
    displayed = [...displayed].sort((a, b) => statusRank(a) - statusRank(b) || b.price - a.price)
  } else {
    displayed = [...displayed].sort((a, b) => statusRank(a) - statusRank(b))
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams)
    if (search) params.set('search', search)
    else params.delete('search')
    setSearchParams(params)
  }

  const setCategory = (id: number | null) => {
    const params = new URLSearchParams(searchParams)
    if (id) params.set('category', String(id))
    else params.delete('category')
    setSearchParams(params)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Phone: search + filter icon (like a shopping app) */}
      <div className="mb-4 flex items-center gap-2 md:hidden">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilter(true)}
          className={`flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium ${
            categoryId || sort
              ? 'border-green-600 bg-green-50 text-green-700'
              : 'border-gray-300 text-gray-600'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filter
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters sidebar (desktop) */}
        <aside className="hidden md:block md:w-60 shrink-0">
          <form onSubmit={handleSearch} className="mb-6">
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </form>

          <p className="text-sm font-medium text-gray-700 mb-2">Categories</p>
          <div className="space-y-1 mb-6">
            <button
              onClick={() => setCategory(null)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                !categoryId ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              All Products
            </button>
            {categories?.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm ${
                  Number(categoryId) === cat.id
                    ? 'bg-green-50 text-green-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-2">Sort by</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Default</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
          </select>
        </aside>

        {/* Product grid */}
        <div className="flex-1">
          <h1 className="mb-4 text-lg font-bold text-gray-900 md:mb-6 md:text-2xl">
            {categoryId ? 'Category Products' : 'All Products'}
          </h1>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                  <div className="h-32 bg-gray-200 rounded-lg mb-3" />
                  <div className="h-4 bg-gray-200 rounded mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : displayed.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <SearchX className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No products found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {displayed.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Phone filter sheet: categories + sort */}
      {showFilter && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowFilter(false)}
            aria-hidden
          />
          <div className="relative w-full max-w-md rounded-t-2xl bg-white p-4 pb-safe sm:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">Filter</h3>
              <button
                type="button"
                onClick={() => setShowFilter(false)}
                aria-label="Close"
                className="p-1 text-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mb-1.5 text-xs font-medium text-gray-500">Categories</p>
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategory(null)}
                className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                  !categoryId
                    ? 'border-green-600 bg-green-600 text-white'
                    : 'border-gray-300 text-gray-600'
                }`}
              >
                All
              </button>
              {categories?.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                    Number(categoryId) === cat.id
                      ? 'border-green-600 bg-green-600 text-white'
                      : 'border-gray-300 text-gray-600'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            <p className="mb-1.5 text-xs font-medium text-gray-500">Sort</p>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Default</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>

            <button
              type="button"
              onClick={() => setShowFilter(false)}
              className="w-full rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white"
            >
              Show {displayed.length}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

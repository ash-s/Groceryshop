import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SearchX } from 'lucide-react'
import { useCategories, useProducts } from '../hooks/useCatalog'
import ProductCard from '../components/ProductCard'

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const categoryIdParam = searchParams.get('category')
  const categoryId = categoryIdParam ? Number(categoryIdParam) : undefined
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('')

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
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Filters sidebar */}
        <aside className="md:w-60 shrink-0">
          <h2 className="font-bold text-gray-900 mb-4">Filters</h2>

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
          <h1 className="text-2xl font-bold text-gray-900 mb-6">
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
              <p>No products found. Try adjusting your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {displayed.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

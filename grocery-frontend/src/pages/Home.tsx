import { Link } from 'react-router-dom'
import { useCategories, useProducts } from '../hooks/useCatalog'
import ProductCard from '../components/ProductCard'

export default function Home() {
  const { data: categories } = useCategories()
  const { data: products } = useProducts()

  const featured = products?.slice(0, 8) ?? []

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-r from-green-600 to-green-700 text-white">
        <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold mb-4">Fresh Groceries Delivered to Your Door</h1>
          <p className="text-green-100 text-lg mb-8">
            Farm-fresh vegetables, fruits, dairy and more — delivered fast.
          </p>
          <Link
            to="/products"
            className="inline-block px-6 py-3 rounded-lg bg-white text-green-700 font-semibold hover:bg-green-50 transition"
          >
            Shop Now
          </Link>
        </div>
      </section>

      {/* Categories */}
      <section className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Shop by Category</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories?.map((cat) => (
            <Link
              key={cat.id}
              to={`/products?category=${cat.id}`}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-4 text-center"
            >
              <div className="text-4xl mb-2">{cat.imageUrl ?? '🛒'}</div>
              <span className="text-sm font-medium text-gray-800">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="max-w-7xl mx-auto px-4 pb-12 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
          <Link to="/products" className="text-green-600 hover:text-green-700 font-medium text-sm">
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Why choose us */}
      <section className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl mb-2">🚚</div>
            <h3 className="font-semibold text-gray-900 mb-1">Fast Delivery</h3>
            <p className="text-sm text-gray-500">Delivery within hours</p>
          </div>
          <div>
            <div className="text-4xl mb-2">🌿</div>
            <h3 className="font-semibold text-gray-900 mb-1">Fresh Products</h3>
            <p className="text-sm text-gray-500">Sourced fresh daily</p>
          </div>
          <div>
            <div className="text-4xl mb-2">💰</div>
            <h3 className="font-semibold text-gray-900 mb-1">Best Prices</h3>
            <p className="text-sm text-gray-500">Direct from suppliers</p>
          </div>
        </div>
      </section>
    </div>
  )
}

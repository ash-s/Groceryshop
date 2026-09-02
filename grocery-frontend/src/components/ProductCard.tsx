import { Link } from 'react-router-dom'
import type { Product } from '../types'
import { useAddToCart } from '../hooks/useCart'
import { useAuth } from '../context/AuthContext'

export default function ProductCard({ product }: { product: Product }) {
  const addToCart = useAddToCart()
  const { isAuthenticated } = useAuth()

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isAuthenticated) return
    addToCart.mutate({ productId: product.id, quantity: 1 })
  }

  return (
    <Link
      to={`/products/${product.id}`}
      className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-4 flex flex-col"
    >
      <div className="h-32 bg-green-50 rounded-lg flex items-center justify-center mb-3 text-5xl">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="h-24 w-24 object-cover rounded" />
        ) : (
          <span>🥦</span>
        )}
      </div>

      <div className="flex-1">
        <h3 className="font-medium text-gray-900 mb-1">{product.name}</h3>
        <p className="text-sm text-gray-500 mb-2">
          {product.stock > 0 ? (
            <span className={product.lowStock ? 'text-red-500' : 'text-gray-500'}>
              {product.lowStock ? `⚠️ Only ${product.stock} left` : `In stock: ${product.stock}`}
            </span>
          ) : (
            <span className="text-red-500">Out of stock</span>
          )}
        </p>
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-lg font-bold text-green-700">${product.price.toFixed(2)}</span>
        <button
          onClick={handleAdd}
          disabled={product.stock <= 0 || addToCart.isPending}
          className="px-3 py-1.5 rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {addToCart.isPending ? 'Adding...' : product.stock > 0 ? 'Add +' : 'Sold Out'}
        </button>
      </div>
    </Link>
  )
}

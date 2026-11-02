import { Link } from 'react-router-dom'
import { AlertTriangle, Salad } from 'lucide-react'
import { formatINR } from '../lib/format'
import type { Product } from '../types'
import { useAddToCart } from '../hooks/useCart'
import { useAuth } from '../context/AuthContext'

export default function ProductCard({ product }: { product: Product }) {
  const addToCart = useAddToCart()
  const { isAuthenticated } = useAuth()
  const out = product.stock <= 0
  const low = !out && product.lowStock

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!isAuthenticated) return
    addToCart.mutate({ productId: product.id, quantity: 1 })
  }

  return (
    <Link
      to={`/products/${product.id}`}
      className={`rounded-xl p-4 flex flex-col transition ${
        out
          ? 'bg-gray-200 border border-gray-300 opacity-60 grayscale'
          : low
            ? 'bg-red-600 border border-red-700'
            : 'bg-white shadow-sm hover:shadow-md'
      }`}
    >
      <div className="h-32 bg-green-50 rounded-lg flex items-center justify-center mb-3 text-5xl">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="h-24 w-24 object-cover rounded" />
        ) : (
          <Salad className="h-16 w-16 text-green-600" />
        )}
      </div>

      <div className="flex-1">
        <h3 className={`mb-1 line-clamp-2 font-medium break-words ${out ? 'text-gray-500' : low ? 'text-white' : 'text-gray-900'}`}>
          {product.name}
        </h3>
        <p className="text-sm mb-2">
          {product.stock > 0 ? (
            <span className={low ? 'text-white' : 'text-gray-500'}>
              {product.lowStock ? (
                <>
                  <AlertTriangle className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />
                  Only {product.stock} left
                </>
              ) : (
                `In stock: ${product.stock}`
              )}
              {' · '}Sold: {product.soldCount ?? 0}
            </span>
          ) : (
            <span className="text-gray-500 font-medium">Out of stock</span>
          )}
        </p>
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className={`text-lg font-bold ${out ? 'text-gray-500' : low ? 'text-white' : 'text-green-700'}`}>
          {formatINR(product.price)}
        </span>
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

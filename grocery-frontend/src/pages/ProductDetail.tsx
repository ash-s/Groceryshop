import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { AlertTriangle, Salad } from 'lucide-react'
import { useProduct } from '../hooks/useCatalog'
import { useAddToCart } from '../hooks/useCart'
import { useAuth } from '../context/AuthContext'
import { Navigate } from 'react-router-dom'

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const productId = Number(id)
  const { data: product, isLoading } = useProduct(productId)
  const addToCart = useAddToCart()
  const { isAuthenticated } = useAuth()
  const [quantity, setQuantity] = useState(1)

  if (isLoading) {
    return <div className="max-w-7xl mx-auto px-4 py-16 text-center">Loading...</div>
  }

  if (!product) {
    return <Navigate to="/products" replace />
  }

  const handleAdd = () => {
    if (!isAuthenticated) return
    addToCart.mutate({ productId: product.id, quantity })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <Link to="/products" className="text-sm text-gray-500 hover:text-green-600 mb-6 inline-block">
        ← Back to Products
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-green-50 rounded-2xl flex items-center justify-center h-80">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover rounded-2xl" />
          ) : (
            <Salad className="h-32 w-32 text-green-600" />
          )}
        </div>

        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
          <p className="text-green-700 text-2xl font-bold mb-2">${product.price.toFixed(2)}</p>

          {product.categoryName && (
            <p className="text-sm text-gray-500 mb-4">
              Category: <span className="font-medium text-gray-700">{product.categoryName}</span>
            </p>
          )}

          <div className="mb-4">
            {product.stock <= 0 || product.lowStock ? (
              <div className="rounded-lg bg-red-600 border border-red-700 px-4 py-3">
                <span className="text-white font-semibold">
                  <AlertTriangle className="inline h-4 w-4 mr-1 -mt-0.5" />
                  {product.stock <= 0
                    ? 'Out of stock'
                    : `Only ${product.stock} left in stock — LOW!`}
                </span>
              </div>
            ) : (
              <p className="text-gray-600">
                {product.stock} available in stock · Sold {product.soldCount ?? 0}
              </p>
            )}
          </div>

          {product.supplierName && (
            <p className="text-sm text-gray-500 mb-6">
              Supplied by: <span className="font-medium text-gray-700">{product.supplierName}</span>
            </p>
          )}

          {product.description && (
            <p className="text-gray-600 mb-6">{product.description}</p>
          )}

          <div className="flex items-center gap-4">
            <div className="flex items-center border border-gray-300 rounded-md">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-2 text-gray-600 hover:bg-gray-50"
              >
                −
              </button>
              <span className="px-3 py-2">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                className="px-3 py-2 text-gray-600 hover:bg-gray-50"
              >
                +
              </button>
            </div>

            <button
              onClick={handleAdd}
              disabled={product.stock <= 0 || addToCart.isPending}
              className="flex-1 px-6 py-3 rounded-md text-white bg-green-600 hover:bg-green-700 font-semibold disabled:opacity-50"
            >
              {!isAuthenticated
                ? 'Login to Add to Cart'
                : addToCart.isPending
                ? 'Adding...'
                : 'Add to Cart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

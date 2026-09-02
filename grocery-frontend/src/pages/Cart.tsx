import { Link } from 'react-router-dom'
import { useCart, useUpdateCartQuantity, useRemoveFromCart } from '../hooks/useCart'

export default function Cart() {
  const { data: cart, isLoading } = useCart()
  const updateQuantity = useUpdateCartQuantity()
  const removeFromCart = useRemoveFromCart()

  if (isLoading) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center">Loading your cart...</div>
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Your cart is empty</h1>
        <p className="text-gray-600 mb-8">Add some fresh groceries to get started.</p>
        <Link
          to="/products"
          className="px-6 py-3 rounded-md text-white bg-green-600 hover:bg-green-700 font-medium"
        >
          Browse Products
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Your Cart ({cart.totalItems} items)
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-4">
              <div className="w-16 h-16 bg-green-50 rounded-lg flex items-center justify-center text-3xl shrink-0">
                {item.imageUrl ? <img src={item.imageUrl} alt={item.productName} className="w-full h-full object-cover rounded-lg" /> : '🥦'}
              </div>

              <div className="flex-1">
                <Link to={`/products/${item.productId}`} className="font-medium text-gray-900 hover:text-green-700">
                  {item.productName}
                </Link>
                <p className="text-sm text-gray-500">${item.price.toFixed(2)} each</p>
              </div>

              <div className="flex items-center border border-gray-300 rounded-md">
                <button
                  onClick={() => updateQuantity.mutate({ itemId: item.id, quantity: Math.max(1, item.quantity - 1) })}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-50"
                >
                  −
                </button>
                <span className="px-3 py-1.5 text-sm">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity.mutate({ itemId: item.id, quantity: Math.min(item.stock, item.quantity + 1) })}
                  className="px-3 py-1.5 text-gray-600 hover:bg-gray-50"
                >
                  +
                </button>
              </div>

              <span className="font-semibold text-gray-900 w-20 text-right">
                ${item.subtotal.toFixed(2)}
              </span>

              <button
                onClick={() => removeFromCart.mutate(item.id)}
                className="text-gray-400 hover:text-red-600 text-xl px-2"
                title="Remove"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm p-6 sticky top-20">
            <h2 className="font-bold text-gray-900 text-lg mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">${cart.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Fee</span>
                <span className="font-medium">$2.00</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Items</span>
                <span>{cart.totalItems}</span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-green-700">${(cart.subtotal + 2).toFixed(2)}</span>
              </div>
            </div>
            <Link
              to="/checkout"
              className="mt-6 block w-full text-center py-3 rounded-md text-white bg-green-600 hover:bg-green-700 font-semibold"
            >
              Proceed to Checkout
            </Link>
            <Link
              to="/products"
              className="mt-3 block w-full text-center py-2 rounded-md text-green-700 border border-green-600 hover:bg-green-50 text-sm"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCart } from '../hooks/useCart'
import { usePlaceOrder } from '../hooks/useOrders'

export default function Checkout() {
  const { data: cart, isLoading } = useCart()
  const placeOrder = usePlaceOrder()
  const navigate = useNavigate()
  const [deliveryAddress, setDeliveryAddress] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('CASH_ON_DELIVERY')
  const [error, setError] = useState('')

  if (isLoading) {
    return <div className="max-w-4xl mx-auto px-4 py-16 text-center">Loading...</div>
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-600 mb-4">Your cart is empty.</p>
        <Link to="/products" className="text-green-600 hover:text-green-700 font-medium">
          Browse Products
        </Link>
      </div>
    )
  }

  const total = cart.subtotal + 2

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const order = await placeOrder.mutateAsync({ deliveryAddress, paymentMethod })
      navigate(`/orders/${order.id}`, { replace: true })
    } catch (err) {
      const errorObj = err as { response?: { data?: { message?: string } } }
      setError(errorObj.response?.data?.message ?? 'Failed to place order')
    }
  }

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500'

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Checkout</h1>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-4">Delivery Address</h2>
              <textarea
                required
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                rows={3}
                placeholder="Full delivery address with city and pincode"
                className={inputClass}
              />
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-bold text-gray-900 mb-4">Payment Method</h2>
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    value="CASH_ON_DELIVERY"
                    checked={paymentMethod === 'CASH_ON_DELIVERY'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>Cash on Delivery</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    value="UPI"
                    checked={paymentMethod === 'UPI'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>UPI / PhonePe</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    value="CARD"
                    checked={paymentMethod === 'CARD'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  />
                  <span>Card</span>
                </label>
              </div>
            </div>
          </form>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm p-6 sticky top-20">
            <h2 className="font-bold text-gray-900 text-lg mb-4">Order Summary</h2>
            <div className="space-y-2 text-sm mb-4">
              {cart.items.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span className="text-gray-600">
                    {item.productName} × {item.quantity}
                  </span>
                  <span className="font-medium">${item.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t pt-2 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>${cart.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery</span>
                <span>$2.00</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-green-700">${total.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={handleSubmit}
              disabled={!deliveryAddress || placeOrder.isPending}
              className="mt-6 w-full py-3 rounded-md text-white bg-green-600 hover:bg-green-700 font-semibold disabled:opacity-50"
            >
              {placeOrder.isPending ? 'Placing Order...' : 'Place Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

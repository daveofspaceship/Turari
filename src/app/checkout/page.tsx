'use client'

import { useState, useEffect } from 'react'
import { useCart } from '@/contexts/CartContext'
import { formatPrice } from '@/lib/data'
import Image from 'next/image'
import TransitionLink from '@/components/TransitionLink'
import { useRouter } from 'next/navigation'
import Navigation from '@/components/Navigation'
import Footer from '@/components/Footer'
import StripeProvider from '@/components/StripeProvider'
import PaymentForm from '@/components/PaymentForm'

const countries = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'NG', name: 'Nigeria' },
]

const CheckoutPage = () => {
  const { items, getCartTotal } = useCart()
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'NG', // Default to Nigeria
    phone: '',
  })

  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isCreatingIntent, setIsCreatingIntent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cartTotal = getCartTotal()
  const shippingCost = cartTotal >= 200000 ? 0 : 10000
  const total = cartTotal + shippingCost

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      router.push('/cart')
    }
  }, [items, router])

  if (items.length === 0) {
    return null
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate form
    if (!formData.email || !formData.firstName || !formData.lastName || 
        !formData.address || !formData.city || !formData.country) {
      setError('Please fill in all required fields')
      return
    }

    setIsCreatingIntent(true)
    setError(null)

    try {
      // Create payment intent
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            size: item.size,
            image: item.image,
          })),
          customerInfo: formData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment intent')
      }

      setClientSecret(data.clientSecret)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsCreatingIntent(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <section className="py-12 md:py-20 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-8 md:mb-12 pt-20 md:pt-0">
            <h1 className="font-playfair text-2xl md:text-4xl font-bold text-primary mb-2">
              Checkout
            </h1>
            <p className="font-inter text-sm md:text-base text-secondary">
              {clientSecret ? 'Complete your payment' : 'Enter your shipping information'}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="font-inter text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Order Summary - Mobile First */}
            <div className="lg:hidden">
              <div className="bg-white rounded-lg shadow-subtle p-6">
                <h2 className="font-playfair text-xl font-semibold text-primary mb-6">
                  Order Summary
                </h2>

                {/* Order Items */}
                <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="relative w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-inter text-sm font-medium text-primary truncate">
                          {item.name}
                        </h3>
                        <p className="font-inter text-xs text-secondary">
                          Qty: {item.quantity}
                        </p>
                        <p className="font-inter text-sm font-semibold text-primary mt-1">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Price Summary */}
                <div className="space-y-3 pt-6 border-t border-gray-200">
                  <div className="flex justify-between font-inter text-sm">
                    <span className="text-secondary">Subtotal</span>
                    <span className="text-primary font-medium">{formatPrice(getCartTotal())}</span>
                  </div>
                  
                  <div className="flex justify-between font-inter text-sm">
                    <span className="text-secondary">Shipping</span>
                    <span className="text-primary font-medium">
                      {shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}
                    </span>
                  </div>

                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between font-inter">
                      <span className="text-primary font-semibold">Total</span>
                      <span className="text-primary font-bold text-lg">{formatPrice(total)}</span>
                    </div>
                  </div>
                </div>

                {/* Back to Cart - Mobile */}
                {!clientSecret && (
                  <div className="mt-6">
                    <TransitionLink href="/cart">
                      <button
                        type="button"
                        className="w-full border border-primary text-primary py-3 rounded-lg font-inter font-medium hover:bg-gray-50 transition-all duration-300"
                      >
                        Back to Cart
                      </button>
                    </TransitionLink>
                  </div>
                )}
              </div>
            </div>

            {/* Checkout Form / Payment Form */}
            <div className="lg:col-span-2 space-y-6">
              {!clientSecret ? (
                // Step 1: Shipping Information Form
                <form onSubmit={handleProceedToPayment}>
                  {/* Contact Information */}
                  <div className="bg-white rounded-lg shadow-subtle p-6 mb-6">
                    <h2 className="font-playfair text-xl font-semibold text-primary mb-4">
                      Contact Information
                    </h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="email" className="block font-inter text-sm font-medium text-primary mb-2">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-inter text-sm"
                          placeholder="your.email@example.com"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="firstName" className="block font-inter text-sm font-medium text-primary mb-2">
                            First Name *
                          </label>
                          <input
                            type="text"
                            id="firstName"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-inter text-sm"
                            placeholder="Enter your first name"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="lastName" className="block font-inter text-sm font-medium text-primary mb-2">
                            Last Name *
                          </label>
                          <input
                            type="text"
                            id="lastName"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-inter text-sm"
                            placeholder="Enter your last name"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="phone" className="block font-inter text-sm font-medium text-primary mb-2">
                          Phone Number *
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-inter text-sm"
                          placeholder="e.g., +1 234 567 8900"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address */}
                  <div className="bg-white rounded-lg shadow-subtle p-6 mb-6">
                    <h2 className="font-playfair text-xl font-semibold text-primary mb-4">
                      Shipping Address
                    </h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="address" className="block font-inter text-sm font-medium text-primary mb-2">
                          Street Address *
                        </label>
                        <input
                          type="text"
                          id="address"
                          name="address"
                          value={formData.address}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-inter text-sm"
                          placeholder="e.g., 123 Main Street"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="city" className="block font-inter text-sm font-medium text-primary mb-2">
                            City *
                          </label>
                          <input
                            type="text"
                            id="city"
                            name="city"
                            value={formData.city}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-inter text-sm"
                            placeholder="Enter your city"
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="postalCode" className="block font-inter text-sm font-medium text-primary mb-2">
                            Postal Code
                          </label>
                          <input
                            type="text"
                            id="postalCode"
                            name="postalCode"
                            value={formData.postalCode}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-inter text-sm"
                            placeholder="Enter your postal code"
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="country" className="block font-inter text-sm font-medium text-primary mb-2">
                          Country *
                        </label>
                        <select
                          id="country"
                          name="country"
                          value={formData.country}
                          onChange={handleInputChange}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-inter text-sm bg-white"
                        >
                          {countries.map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Continue to Payment Button */}
                  <button
                    type="submit"
                    disabled={isCreatingIntent}
                    className="w-full bg-primary text-white py-4 rounded-lg font-inter font-medium text-lg hover:bg-gray-800 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    {isCreatingIntent ? (
                      <>
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Preparing...
                      </>
                    ) : (
                      <>
                        Continue to Payment
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                // Step 2: Payment Form
                <StripeProvider clientSecret={clientSecret}>
                  <PaymentForm amount={total} />
                </StripeProvider>
              )}
            </div>

            {/* Order Summary - Desktop Only */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="bg-white rounded-lg shadow-subtle p-6 sticky top-24">
                <h2 className="font-playfair text-xl font-semibold text-primary mb-6">
                  Order Summary
                </h2>

                {/* Order Items */}
                <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3">
                      <div className="relative w-16 h-16 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-inter text-sm font-medium text-primary truncate">
                          {item.name}
                        </h3>
                        <p className="font-inter text-xs text-secondary">
                          Qty: {item.quantity}
                        </p>
                        <p className="font-inter text-sm font-semibold text-primary mt-1">
                          {formatPrice(item.price * item.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Price Summary */}
                <div className="space-y-3 mb-6 pt-6 border-t border-gray-200">
                  <div className="flex justify-between font-inter text-sm">
                    <span className="text-secondary">Subtotal</span>
                    <span className="text-primary font-medium">{formatPrice(getCartTotal())}</span>
                  </div>
                  
                  <div className="flex justify-between font-inter text-sm">
                    <span className="text-secondary">Shipping</span>
                    <span className="text-primary font-medium">
                      {shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}
                    </span>
                  </div>

                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between font-inter">
                      <span className="text-primary font-semibold">Total</span>
                      <span className="text-primary font-bold text-lg">{formatPrice(total)}</span>
                    </div>
                  </div>
                </div>

                {/* Back to Cart */}
                {!clientSecret && (
                  <TransitionLink href="/cart">
                    <button
                      type="button"
                      className="w-full border border-primary text-primary py-3 rounded-lg font-inter font-medium hover:bg-gray-50 transition-all duration-300"
                    >
                      Back to Cart
                    </button>
                  </TransitionLink>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

export default CheckoutPage

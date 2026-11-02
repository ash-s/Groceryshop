import { useQuery } from '@tanstack/react-query'
import { categoryApi, productApi, supplierApi } from '../api/catalog'

export function useProducts(params?: { categoryId?: number; search?: string; shop?: string }) {
  return useQuery({
    queryKey: ['products', params?.categoryId, params?.search, params?.shop],
    queryFn: () => productApi.getAll(params),
  })
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => productApi.getById(id),
    enabled: !!id,
  })
}

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    queryFn: categoryApi.getAll,
  })
}

export function useSuppliers() {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: supplierApi.getAll,
  })
}

export function useSupplierProducts(id: number) {
  return useQuery({
    queryKey: ['supplier-products', id],
    queryFn: () => supplierApi.getProducts(id),
    enabled: !!id,
  })
}
export function useSupplierPurchases(id: number) {
  return useQuery({
    queryKey: ['supplier-purchases', id],
    queryFn: () => supplierApi.getPurchases(id),
    enabled: !!id,
  })
}

export function useLowStockProducts() {
  return useQuery({
    queryKey: ['low-stock'],
    queryFn: productApi.getLowStock,
  })
}

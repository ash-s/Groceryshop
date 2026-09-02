import { useQuery } from '@tanstack/react-query'
import { categoryApi, productApi, supplierApi } from '../api/catalog'

export function useProducts(params?: { categoryId?: number; search?: string }) {
  return useQuery({
    queryKey: ['products', params?.categoryId, params?.search],
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

export function useLowStockProducts() {
  return useQuery({
    queryKey: ['low-stock'],
    queryFn: productApi.getLowStock,
  })
}

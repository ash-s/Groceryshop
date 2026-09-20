import { useQuery } from '@tanstack/react-query'
import { adminUserApi } from '../api/users'

export function useUsers() {
  return useQuery({
    queryKey: ['admin-users'],
    queryFn: adminUserApi.list,
  })
}
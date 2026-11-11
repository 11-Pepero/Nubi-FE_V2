import { useQuery } from '@tanstack/react-query'
import { supportTagApi } from '@/api/endpoints'
import { qk } from '@/lib/queryKeys'

export function useSupportTags() {
  return useQuery({ queryKey: qk.supportTags, queryFn: () => supportTagApi.list() })
}

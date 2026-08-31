import { useQuery } from '@tanstack/react-query';
import { fetchFileVault } from '../services/file-vault-service';

export function useFileVault() {
  return useQuery({
    queryKey: ['file-vault'],
    queryFn: fetchFileVault,
    staleTime: 0,
  });
}

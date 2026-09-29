import { QueryClient, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API_URL, apiGet } from "./api";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 3,
      gcTime: 1000 * 60 * 15,
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

export function useCampusQuery() {
  return useQuery({
    queryKey: ["campus"],
    queryFn: async () => {
      const data = await apiGet("/api/campus");
      return Array.isArray(data) ? data : [];
    }
  });
}

export function useDiasBloqueadosQuery() {
  return useQuery({
    queryKey: ["calendario", "bloqueos"],
    queryFn: async () => {
      const data = await apiGet("/api/calendario/bloqueos");
      return Array.isArray(data) ? data : [];
    }
  });
}

export function useFeriadosQuery(year = new Date().getFullYear()) {
  return useQuery({
    queryKey: ["feriados", year],
    queryFn: async () => {
      try {
        const data = await apiGet(`/api/feriados?year=${year}`);
        const lista = data?.feriados || data?.detalles || data;
        if (Array.isArray(lista)) {
          return lista.map((f) => (typeof f === "string" ? f : f.fecha));
        }
        return [];
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 60 * 24
  });
}

export function useDisponibilidadQuery(campusId, fecha) {
  return useQuery({
    queryKey: ["disponibilidad", campusId, fecha],
    queryFn: async () => {
      const data = await apiGet(`/api/disponibilidad?campus_id=${campusId}&fecha=${fecha}`);
      return data?.bloques || [];
    },
    enabled: Boolean(campusId && fecha),
    staleTime: 1000 * 30
  });
}

export function useCmsAnunciosQuery() {
  return useQuery({
    queryKey: ["cms", "anuncios"],
    queryFn: async () => {
      const data = await apiGet("/api/cms/anuncios");
      return Array.isArray(data) ? data : [];
    }
  });
}

export function useCmsTarjetasQuery() {
  return useQuery({
    queryKey: ["cms", "tarjetas"],
    queryFn: async () => {
      const data = await apiGet("/api/cms/tarjetas");
      return Array.isArray(data) ? data : [];
    }
  });
}

export function useCmsFaqsQuery() {
  return useQuery({
    queryKey: ["cms", "faqs"],
    queryFn: async () => {
      const data = await apiGet("/api/cms/faqs");
      return Array.isArray(data) ? data : [];
    }
  });
}

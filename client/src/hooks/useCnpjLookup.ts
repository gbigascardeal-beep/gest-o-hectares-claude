import { useRef } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { isValidCnpj, onlyDigits } from "@shared/cnpj";

export type CnpjResult = {
  cnpj: string;
  companyName: string;
  tradeName: string;
  cep: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  situation: string;
  isActive: boolean;
  alreadyRegistered: boolean;
};

/**
 * Consulta os dados públicos da empresa pelo CNPJ e entrega ao formulário.
 * - `check(valor)`: chame a cada digitação; consulta sozinho quando o CNPJ fica completo e válido.
 * - `lookup(valor)`: consulta na hora (botão "Consultar").
 */
export function useCnpjLookup(onFound: (data: CnpjResult) => void) {
  const lastDigits = useRef("");
  const mutation = trpc.suppliers.lookupCnpj.useMutation({
    onSuccess: (data) => {
      if (data.alreadyRegistered) {
        toast.error("Esse CNPJ já está cadastrado no seu catálogo de fornecedores.");
        return;
      }
      onFound(data);
      if (!data.isActive) {
        toast.warning(`Atenção: a situação dessa empresa na Receita é "${data.situation}". Confira antes de cadastrar.`);
      } else {
        toast.success("Dados preenchidos pela Receita Federal. Confira antes de cadastrar.");
      }
    },
    onError: (error) => {
      lastDigits.current = ""; // permite tentar de novo
      toast.error(error.message);
    },
  });

  const lookup = (value: string) => {
    const digits = onlyDigits(value);
    if (!isValidCnpj(digits)) {
      toast.error("CNPJ inválido. Confira os 14 números.");
      return;
    }
    lastDigits.current = digits;
    mutation.mutate({ cnpj: digits });
  };

  const check = (value: string) => {
    const digits = onlyDigits(value);
    if (digits.length < 14) lastDigits.current = "";
    if (digits.length === 14 && isValidCnpj(digits) && digits !== lastDigits.current && !mutation.isPending) {
      lastDigits.current = digits;
      mutation.mutate({ cnpj: digits });
    }
  };

  return { lookup, check, loading: mutation.isPending };
}

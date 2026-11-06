import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, FileText, Package, Truck, Percent, CreditCard, ChevronRight, Check, ChevronsUpDown, ArrowLeft, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { formatCnpj, onlyDigits } from "@shared/cnpj";
import { calcOrderTotals, formatBRL, itemTotal } from "@shared/orderTotals";
import { useCnpjLookup } from "@/hooks/useCnpjLookup";

interface OrderItem {
  productId: string;
  productName: string;
  quantity: string;
  unit: string;
  unitValue: string;
  discount: string;
  isSpecificUse: boolean;
}

interface FormData {
  supplierId: string;
  emissionDate: string;
  costCenterId: string;
  nfeNumber: string;
}

interface TransportData {
  freightValue: string;
  addFreightToTotal: boolean;
  carrier: string;
}

interface TotalData {
  taxes: string;
  taxesApply: boolean;
  discountValue: string;
  discountPercent: string;
  discountApply: boolean;
}

interface PaymentData {
  type: "a_vista" | "parcelado";
  dueDate: string;
  paymentMethod: string;
  installmentInterval: string;
  installmentCount: string;
  firstInstallmentDate: string;
}

interface InstallmentData {
  dueDate: string;
  value: number;
  paymentMethod: string;
}

const UNITS = [
  { value: "UND", label: "Unidade" },
  { value: "CX", label: "Caixa" },
  { value: "KL", label: "Kilo" },
  { value: "PCT", label: "Pacote" },
  { value: "M", label: "Metro" },
  { value: "L", label: "Litro" },
  { value: "TON", label: "Tonelada" },
  { value: "PAR", label: "Par" },
];

const INSTALLMENT_INTERVALS = [
  { value: "15", label: "15 dias" },
  { value: "20", label: "20 dias" },
  { value: "30", label: "30 dias" },
];

const PAYMENT_METHODS = [
  "Pix - Obras",
  "Pix - Estoque",
  "Pix - Manutenção",
  "Pix - Jardinagem",
  "Pix - Limpeza",
  "Pix - Monitores / Eventos",
  "Pix - Segurança",
  "Pix - Administração / Gerencia",
  "Boleto Bancario - Obras",
  "Boleto Bancario - Estoque",
  "Boleto Bancario - Manutenção",
  "Boleto Bancario - Jardinagem",
  "Boleto Bancario - Limpeza",
  "Boleto Bancario - Monitores / Eventos",
  "Boleto Bancario - Segurança",
  "Boleto Bancario - Administração / Gerencia",
];

export default function NewPurchaseOrder() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [costCenterOpen, setCostCenterOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [observations, setObservations] = useState("");
  const [internalObservations, setInternalObservations] = useState("");
  const [showNewSupplierDialog, setShowNewSupplierDialog] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierCNPJ, setNewSupplierCNPJ] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [newSupplierEmail, setNewSupplierEmail] = useState("");
  const [newSupplierCEP, setNewSupplierCEP] = useState("");
  const [newSupplierAddress, setNewSupplierAddress] = useState("");
  const [newSupplierCity, setNewSupplierCity] = useState("");
  const [newSupplierState, setNewSupplierState] = useState("");
  const [newSupplierTradeName, setNewSupplierTradeName] = useState("");
  const cnpjLookup = useCnpjLookup((d) => {
    // só sobrescreve o que a Receita devolveu; o resto fica como a pessoa digitou
    if (d.companyName) setNewSupplierName(d.companyName);
    if (d.tradeName) setNewSupplierTradeName(d.tradeName);
    if (d.cep) setNewSupplierCEP(d.cep);
    if (d.address) setNewSupplierAddress(d.address);
    if (d.city) setNewSupplierCity(d.city);
    if (d.state) setNewSupplierState(d.state);
    if (d.phone) setNewSupplierPhone(d.phone);
    if (d.email) setNewSupplierEmail(d.email);
  });
  const [loadingCEP, setLoadingCEP] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    supplierId: "",
    emissionDate: new Date().toISOString().split("T")[0],
    costCenterId: "",
    nfeNumber: "",
  });

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [currentItem, setCurrentItem] = useState<OrderItem>({
    productId: "",
    productName: "",
    quantity: "",
    unit: "UND",
    unitValue: "",
    discount: "0",
    isSpecificUse: false,
  });

  const [transportData, setTransportData] = useState<TransportData>({
    freightValue: "0",
    addFreightToTotal: false,
    carrier: "",
  });

  const [totalData, setTotalData] = useState<TotalData>({
    taxes: "0",
    taxesApply: false,
    discountValue: "0",
    discountPercent: "0",
    discountApply: false,
  });

  const [paymentData, setPaymentData] = useState<PaymentData>({
    type: "a_vista",
    dueDate: new Date().toISOString().split("T")[0],
    paymentMethod: "",
    installmentInterval: "30",
    installmentCount: "1",
    firstInstallmentDate: new Date().toISOString().split("T")[0],
  });

  const [installments, setInstallments] = useState<InstallmentData[]>([]);

  const { data: suppliers = [] } = trpc.suppliers.list.useQuery() as any;
  const { data: costCenters = [] } = trpc.costCenters.list.useQuery() as any;
  const { data: products = [] } = trpc.products.list.useQuery({ search: productSearch }) as any;
  
  const createOrderMutation = trpc.purchaseOrders.create.useMutation({
    onSuccess: () => {
      toast.success("Ordem de compra cadastrada com sucesso!");
      setLocation("/purchase-orders");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao cadastrar ordem de compra");
    },
  });

  const utils = trpc.useUtils();
  const createSupplierMutation = trpc.suppliers.create.useMutation({
    onSuccess: async (created: any) => {
      toast.success("Fornecedor cadastrado com sucesso!");
      await utils.suppliers.list.invalidate();
      const createdId = Array.isArray(created) ? created[0]?.id : undefined;
      if (createdId) setFormData((prev) => ({ ...prev, supplierId: String(createdId) }));
      setShowNewSupplierDialog(false);
      setNewSupplierName("");
      setNewSupplierCNPJ("");
      setNewSupplierPhone("");
      setNewSupplierEmail("");
      setNewSupplierCEP("");
      setNewSupplierAddress("");
      setNewSupplierCity("");
      setNewSupplierState("");
      setNewSupplierTradeName("");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao cadastrar fornecedor");
    },
  });

  const steps = [
    { id: 0, label: "Dados Gerais", icon: FileText },
    { id: 1, label: "Produtos", icon: Package },
    { id: 2, label: "Transporte", icon: Truck },
    { id: 3, label: "Impostos", icon: Percent },
    { id: 4, label: "Pagamento", icon: CreditCard },
  ];

  const handleAddItem = () => {
    if ((!currentItem.productId && !currentItem.productName) || !currentItem.quantity || !currentItem.unitValue) {
      toast.error("Preencha todos os campos do produto");
      return;
    }
    setOrderItems([...orderItems, currentItem]);
    setCurrentItem({ productId: "", productName: "", quantity: "", unit: "UND", unitValue: "", discount: "0", isSpecificUse: false });
    toast.success("Produto adicionado");
  };

  const handleRemoveItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
    toast.success("Produto removido");
  };

  // Total da ordem, recalculado a cada alteração (é o mesmo valor que será gravado)
  const totals = calcOrderTotals({
    items: orderItems,
    freightValue: transportData.freightValue,
    addFreightToTotal: transportData.addFreightToTotal,
    taxes: totalData.taxes,
    applyTaxes: totalData.taxesApply,
    discountValue: totalData.discountValue,
    discountPercent: totalData.discountPercent,
  });

  const handleNext = () => {
    if (currentStep === 0) {
      if (!formData.supplierId || !formData.costCenterId) {
        toast.error("Preencha os campos obrigatórios");
        return;
      }
    }
    // Produtos é opcional - permite pular
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      const freightValue = parseFloat(transportData.freightValue) || 0;
      const finalTotalValue = totals.total;

      if (paymentData.type === "parcelado" && installments.length === 0) {
        toast.error("Por favor, gere as parcelas antes de cadastrar");
        return;
      }

      await createOrderMutation.mutateAsync({
        supplierId: parseInt(formData.supplierId || "0"),
        costCenterId: parseInt(formData.costCenterId || "0"),
        paymentMethod: paymentData.type,
        installments: paymentData.type === "parcelado" ? installments.length : 1,
        totalValue: finalTotalValue.toString(),
        freightValue: freightValue.toString(),
        observations: observations.trim() || undefined,
        items: orderItems.map(item => {
          const quantity = parseFloat(item.quantity) || 0;
          const unitValue = parseFloat(item.unitValue) || 0;
          const totalValue = itemTotal(item);
          return {
            productId: item.productId ? parseInt(item.productId) : undefined,
            productName: item.productName || undefined,
            quantity: Math.floor(quantity),
            unitValue: unitValue.toString(),
            totalValue: totalValue.toString(),
            isSpecificUse: item.isSpecificUse,
          };
        }),
      });
      
      toast.success("Ordem de compra cadastrada com sucesso!");
      setLocation("/purchase-orders");
    } catch (error: any) {
      console.error("Erro ao cadastrar ordem:", error);
      toast.error(error.message || "Erro ao cadastrar ordem de compra");
    }
  };

  const handleSearchCEP = async (cep: string) => {
    if (cep.length !== 8) return;
    
    setLoadingCEP(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        toast.error("CEP não encontrado");
        setLoadingCEP(false);
        return;
      }
      
      setNewSupplierAddress(data.logradouro || "");
      setNewSupplierCity(data.localidade || "");
      setNewSupplierState(data.uf || "");
      toast.success("Endereço preenchido automaticamente!");
    } catch (error) {
      toast.error("Erro ao buscar CEP");
    } finally {
      setLoadingCEP(false);
    }
  };

  const handleAddNewSupplier = async () => {
    if (!newSupplierName || !newSupplierCNPJ || !newSupplierPhone || !newSupplierCEP || !newSupplierAddress) {
      toast.error("Preencha todos os campos obrigatórios do fornecedor");
      return;
    }
    
    createSupplierMutation.mutate({
      cnpj: newSupplierCNPJ,
      companyName: newSupplierName,
      ...(newSupplierTradeName.trim() ? { tradeName: newSupplierTradeName.trim() } : {}),
      email: newSupplierEmail,
      phone: newSupplierPhone,
      address: newSupplierAddress,
      cep: newSupplierCEP,
      city: newSupplierCity,
      state: newSupplierState,
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/purchase-orders")}
              className="mr-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Nova Ordem de Compra</h1>
              <p className="text-sm text-gray-500">Preencha as informações da ordem de compra seguindo as etapas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === index;
              const isCompleted = currentStep > index;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-all ${
                        isActive
                          ? "bg-blue-500 text-white shadow-lg"
                          : isCompleted
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {isCompleted ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                    </div>
                    <span
                      className={`text-xs font-medium text-center ${
                        isActive ? "text-blue-600" : isCompleted ? "text-green-600" : "text-gray-600"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 ${
                        isCompleted ? "bg-green-500" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow p-8">
          {/* Dados Gerais */}
          {currentStep === 0 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Informações Gerais</h2>
                <p className="text-sm text-gray-600 mb-6">Dados básicos da ordem de compra</p>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Número da Ordem</Label>
                  <Input
                    value="Gerado automaticamente ao cadastrar"
                    readOnly
                    disabled
                    className="h-11 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Data de Emissão *</Label>
                  <Input
                    type="date"
                    value={formData.emissionDate}
                    onChange={(e) => setFormData({ ...formData, emissionDate: e.target.value })}
                    className="h-11 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Fornecedor *</Label>
                  <div className="flex gap-2">
                    <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={supplierOpen}
                          className="flex-1 justify-between h-11 text-base"
                        >
                          {formData.supplierId
                            ? suppliers?.find((s: any) => s.id.toString() === formData.supplierId)?.companyName
                            : "Selecione um fornecedor"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Buscar fornecedor..." />
                          <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
                          <CommandGroup>
                            {(suppliers || []).map((supplier: any) => (
                              <CommandItem
                                key={supplier.id}
                                value={supplier.id.toString()}
                                onSelect={(currentValue) => {
                                  setFormData({
                                    ...formData,
                                    supplierId: currentValue === formData.supplierId ? "" : currentValue,
                                  });
                                  setSupplierOpen(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    formData.supplierId === supplier.id.toString() ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                {supplier.companyName}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowNewSupplierDialog(true)}
                      className="h-11 px-4"
                      title="Cadastrar novo fornecedor"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Centro de Custo *</Label>
                  <Popover open={costCenterOpen} onOpenChange={setCostCenterOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={costCenterOpen}
                        className="w-full justify-between h-11 text-base"
                      >
                        {formData.costCenterId
                          ? costCenters?.find((c: any) => c.id.toString() === formData.costCenterId)?.name
                          : "Selecione um centro"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Buscar centro..." />
                        <CommandEmpty>Nenhum centro encontrado.</CommandEmpty>
                        <CommandGroup>
                          {(costCenters || []).map((center: any) => (
                            <CommandItem
                              key={center.id}
                              value={center.id.toString()}
                              onSelect={(currentValue) => {
                                setFormData({
                                  ...formData,
                                  costCenterId: currentValue === formData.costCenterId ? "" : currentValue,
                                });
                                setCostCenterOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  formData.costCenterId === center.id.toString() ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              {center.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="border-t pt-6">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Número da NF-e (Opcional)</Label>
                  <Input
                    placeholder="Digite o número da nota fiscal"
                    value={formData.nfeNumber}
                    onChange={(e) => setFormData({ ...formData, nfeNumber: e.target.value })}
                    className="h-11 text-base"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Produtos */}
          {currentStep === 1 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Produtos e Serviços</h2>
                <p className="text-sm text-gray-600 mb-6">Adicione os itens da ordem de compra</p>
              </div>

              <div className="bg-blue-50 rounded-lg p-6 border border-blue-100 space-y-6">
                <h3 className="font-bold text-gray-900">Adicionar Produto</h3>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Produto *</Label>
                  <div className="relative">
                    <Input
                      placeholder="Digite para buscar ou insira um produto novo..."
                      value={productSearch || currentItem.productName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setProductSearch(val);
                        setCurrentItem({ ...currentItem, productName: val, productId: "" });
                      }}
                      className="h-11 text-base"
                    />
                    {productSearch && products && products.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {products.map((product: any) => (
                          <button
                            key={product.id}
                            type="button"
                            className="w-full text-left px-4 py-2.5 hover:bg-blue-50 text-sm border-b border-gray-100 last:border-0 flex items-center gap-2"
                            onClick={() => {
                              setCurrentItem({
                                ...currentItem,
                                productId: product.id.toString(),
                                productName: product.description,
                                unitValue: currentItem.unitValue || "",
                              });
                              setProductSearch("");
                            }}
                          >
                            <Package className="w-4 h-4 text-blue-500 shrink-0" />
                            <span>{product.description}</span>
                            <span className="ml-auto text-xs text-gray-400">Estoque: {product.currentQuantity}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {productSearch && (!products || products.length === 0) && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                        <p className="text-sm text-gray-600">
                          Nenhum produto encontrado. O texto digitado será usado como nome do produto novo.
                        </p>
                      </div>
                    )}
                  </div>
                  {currentItem.productName && !currentItem.productId && (
                    <p className="text-xs text-blue-600 mt-1">Produto novo: "{currentItem.productName}"</p>
                  )}
                  {currentItem.productName && currentItem.productId && (
                    <p className="text-xs text-green-600 mt-1">Produto do estoque selecionado</p>
                  )}
                </div>

                <label className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4"
                    checked={currentItem.isSpecificUse}
                    onChange={(e) => setCurrentItem({ ...currentItem, isSpecificUse: e.target.checked })}
                  />
                  <span className="text-sm text-gray-800">
                    <span className="font-semibold">Produto de uso específico</span>
                    <span className="block text-xs text-gray-600">Marque se este item não deve entrar no estoque quando a ordem for entregue.</span>
                  </span>
                </label>

                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Quantidade *</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={currentItem.quantity}
                      onChange={(e) => setCurrentItem({ ...currentItem, quantity: e.target.value })}
                      className="h-11 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Unidade *</Label>
                    <select
                      value={currentItem.unit}
                      onChange={(e) => setCurrentItem({ ...currentItem, unit: e.target.value })}
                      className="h-11 px-3 border border-gray-300 rounded-md text-base"
                    >
                      {UNITS.map((unit) => (
                        <option key={unit.value} value={unit.value}>
                          {unit.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Valor Unitário *</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={currentItem.unitValue}
                      onChange={(e) => setCurrentItem({ ...currentItem, unitValue: e.target.value })}
                      className="h-11 text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Desconto</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={currentItem.discount}
                      onChange={(e) => setCurrentItem({ ...currentItem, discount: e.target.value })}
                      className="h-11 text-base"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleAddItem}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Produto
                </Button>
              </div>

              {orderItems.length > 0 && (
                <div className="border-t pt-6">
                  <h3 className="font-bold text-gray-900 mb-4">Produtos Adicionados</h3>
                  <div className="space-y-3">
                    {orderItems.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {item.productName || `Produto #${item.productId}`}
                            {item.isSpecificUse && <span className="ml-2 text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">Uso específico</span>}
                          </p>
                          <p className="text-sm text-gray-600">
                            {item.quantity} {item.unit} × R$ {parseFloat(item.unitValue).toFixed(2)} = R$ {(parseFloat(item.quantity || "0") * parseFloat(item.unitValue || "0") - parseFloat(item.discount || "0")).toFixed(2)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Transporte */}
          {currentStep === 2 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Transporte</h2>
                <p className="text-sm text-gray-600 mb-6">Informações de frete e transportadora</p>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Valor do Frete</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={transportData.freightValue}
                    onChange={(e) => setTransportData({ ...transportData, freightValue: e.target.value })}
                    className="h-11 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Transportadora</Label>
                  <Input
                    placeholder="Nome da transportadora"
                    value={transportData.carrier}
                    onChange={(e) => setTransportData({ ...transportData, carrier: e.target.value })}
                    className="h-11 text-base"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  id="addFreight"
                  checked={transportData.addFreightToTotal}
                  onChange={(e) => setTransportData({ ...transportData, addFreightToTotal: e.target.checked })}
                  className="w-5 h-5"
                />
                <Label htmlFor="addFreight" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Adicionar valor do frete ao total da ordem
                </Label>
              </div>
            </div>
          )}

          {/* Impostos */}
          {currentStep === 3 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Impostos e Descontos</h2>
                <p className="text-sm text-gray-600 mb-6">Cálculos e ajustes de valores</p>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Impostos (R$)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={totalData.taxes}
                    onChange={(e) => setTotalData({ ...totalData, taxes: e.target.value })}
                    className="h-11 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Desconto (R$)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={totalData.discountValue}
                    onChange={(e) => setTotalData({ ...totalData, discountValue: e.target.value })}
                    className="h-11 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-700">Desconto (%)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={totalData.discountPercent}
                    onChange={(e) => setTotalData({ ...totalData, discountPercent: e.target.value })}
                    className="h-11 text-base"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <input
                  type="checkbox"
                  id="applyTaxes"
                  checked={totalData.taxesApply}
                  onChange={(e) => setTotalData({ ...totalData, taxesApply: e.target.checked })}
                  className="w-5 h-5"
                />
                <Label htmlFor="applyTaxes" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Aplicar impostos ao total
                </Label>
              </div>
            </div>
          )}

          {/* Pagamento */}
          {currentStep === 4 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Pagamento</h2>
                <p className="text-sm text-gray-600 mb-6">Condições de pagamento</p>
              </div>

              <div className="space-y-6">
                <div className="flex gap-6">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentType"
                      value="a_vista"
                      checked={paymentData.type === "a_vista"}
                      onChange={(e) => setPaymentData({ ...paymentData, type: e.target.value as any })}
                      className="w-5 h-5"
                    />
                    <span className="font-medium text-gray-700">À Vista</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentType"
                      value="parcelado"
                      checked={paymentData.type === "parcelado"}
                      onChange={(e) => setPaymentData({ ...paymentData, type: e.target.value as any })}
                      className="w-5 h-5"
                    />
                    <span className="font-medium text-gray-700">Parcelado</span>
                  </label>
                </div>

                {paymentData.type === "a_vista" && (
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Data de Vencimento</Label>
                      <Input
                        type="date"
                        value={paymentData.dueDate}
                        onChange={(e) => setPaymentData({ ...paymentData, dueDate: e.target.value })}
                        className="h-11 text-base"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Forma de Pagamento</Label>
                      <select
                        value={paymentData.paymentMethod}
                        onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                        className="h-11 px-3 border border-gray-300 rounded-md text-base"
                      >
                        <option value="">Selecione uma forma</option>
                        {PAYMENT_METHODS.map((method) => (
                          <option key={method} value={method}>
                            {method}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {paymentData.type === "parcelado" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-gray-700">Intervalo entre Parcelas</Label>
                        <select
                          value={paymentData.installmentInterval}
                          onChange={(e) => setPaymentData({ ...paymentData, installmentInterval: e.target.value })}
                          className="h-11 px-3 border border-gray-300 rounded-md text-base"
                        >
                          {INSTALLMENT_INTERVALS.map((interval) => (
                            <option key={interval.value} value={interval.value}>
                              {interval.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-gray-700">Quantidade de Parcelas</Label>
                        <Input
                          type="number"
                          min="1"
                          value={paymentData.installmentCount}
                          onChange={(e) => setPaymentData({ ...paymentData, installmentCount: e.target.value })}
                          className="h-11 text-base"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-gray-700">Forma de Pagamento</Label>
                        <select
                          value={paymentData.paymentMethod}
                          onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                          className="h-11 px-3 border border-gray-300 rounded-md text-base"
                        >
                          <option value="">Selecione uma forma</option>
                          {PAYMENT_METHODS.map((method) => (
                            <option key={method} value={method}>
                              {method}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-semibold text-gray-700">Data da 1ª Parcela</Label>
                        <Input
                          type="date"
                          value={paymentData.firstInstallmentDate}
                          onChange={(e) => setPaymentData({ ...paymentData, firstInstallmentDate: e.target.value })}
                          className="h-11 text-base"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={() => {
                        const installmentCount = parseInt(paymentData.installmentCount);
                        if (!installmentCount || installmentCount < 1) {
                          toast.error("Informe o número de parcelas");
                          return;
                        }
                        // parcelas somam exatamente o total final (a última leva a diferença dos centavos)
                        const installmentValue = Math.floor((totals.total * 100) / installmentCount) / 100;
                        const lastInstallmentValue = Math.round((totals.total - installmentValue * (installmentCount - 1)) * 100) / 100;
                        const interval = parseInt(paymentData.installmentInterval);
                        const firstDate = new Date(paymentData.firstInstallmentDate);
                        const newInstallments: InstallmentData[] = [];
                        
                        for (let i = 0; i < installmentCount; i++) {
                          const dueDate = new Date(firstDate);
                          dueDate.setDate(dueDate.getDate() + (i * interval));
                          newInstallments.push({
                            dueDate: dueDate.toISOString().split('T')[0],
                            value: i === installmentCount - 1 ? lastInstallmentValue : installmentValue,
                            paymentMethod: paymentData.paymentMethod,
                          });
                        }
                        
                        setInstallments(newInstallments);
                        toast.success(`${installmentCount} parcelas geradas com sucesso!`);
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Gerar Parcelas
                    </Button>

                    {installments.length > 0 && (
                      <div className="border-t pt-6">
                        <h3 className="font-bold text-gray-900 mb-4">Parcelas Geradas</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-gray-200 bg-gray-50">
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Parcela</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Vencimento</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Valor</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Forma de Pagamento</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Ação</th>
                              </tr>
                            </thead>
                            <tbody>
                              {installments.map((installment, index) => (
                                <tr key={index} className="border-b border-gray-200 hover:bg-gray-50">
                                  <td className="py-3 px-4 text-gray-900">{index + 1}</td>
                                  <td className="py-3 px-4 text-gray-900">{new Date(installment.dueDate).toLocaleDateString('pt-BR')}</td>
                                  <td className="py-3 px-4 text-gray-900">R$ {installment.value.toFixed(2)}</td>
                                  <td className="py-3 px-4 text-gray-900">{installment.paymentMethod}</td>
                                  <td className="py-3 px-4">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setInstallments(installments.filter((_, i) => i !== index));
                                        toast.success("Parcela removida");
                                      }}
                                      className="text-red-600 hover:bg-red-50"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Observações */}
              <div className="border-t pt-8 space-y-6">
                <h3 className="font-bold text-gray-900">Observações</h3>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Observações</Label>
                    <textarea
                      placeholder="Digite observações sobre a ordem"
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      className="w-full h-24 p-3 border border-gray-300 rounded-md text-base"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-700">Observações Internas</Label>
                    <textarea
                      placeholder="Digite observações internas"
                      value={internalObservations}
                      onChange={(e) => setInternalObservations(e.target.value)}
                      className="w-full h-24 p-3 border border-gray-300 rounded-md text-base"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Total da ordem: visível durante todo o cadastro */}
        {currentStep >= 1 && (
          <div className="sticky bottom-0 z-30 mt-4 rounded-lg border border-gray-200 bg-white shadow-lg px-6 py-3">
            <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
                <span>Produtos: <strong className="text-gray-900">{formatBRL(totals.subtotal)}</strong></span>
                <span>Frete: <strong className="text-gray-900">{formatBRL(totals.freight)}</strong></span>
                <span>Impostos: <strong className="text-gray-900">{formatBRL(totals.taxes)}</strong></span>
                <span>Desconto: <strong className="text-gray-900">- {formatBRL(totals.discount)}</strong></span>
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-600 mr-2">Total da ordem</span>
                <span className="text-2xl font-bold text-green-700">{formatBRL(totals.total)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Botões de Navegação */}
        <div className="mt-8 flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="h-11 px-6 text-base"
          >
            Anterior
          </Button>

          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setLocation("/purchase-orders")}
              className="h-11 px-6 text-base text-red-600 border-red-300 hover:bg-red-50"
            >
              Cancelar
            </Button>

            {currentStep === steps.length - 1 ? (
              <Button
                onClick={handleSubmit}
                className="h-11 px-8 text-base bg-green-600 hover:bg-green-700"
              >
                Cadastrar Ordem
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="h-11 px-6 text-base bg-blue-600 hover:bg-blue-700"
              >
                Próximo
                <ChevronRight className="ml-2 w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Dialog para Cadastro de Novo Fornecedor */}
      <Dialog open={showNewSupplierDialog} onOpenChange={setShowNewSupplierDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Linha 1: CNPJ + consulta */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-gray-700">CNPJ *</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="00.000.000/0000-00"
                  inputMode="numeric"
                  value={newSupplierCNPJ}
                  onChange={(e) => {
                    const formatted = formatCnpj(e.target.value);
                    setNewSupplierCNPJ(formatted);
                    cnpjLookup.check(formatted);
                  }}
                  className="h-11 text-base flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11"
                  disabled={cnpjLookup.loading || onlyDigits(newSupplierCNPJ).length !== 14}
                  onClick={() => cnpjLookup.lookup(newSupplierCNPJ)}
                >
                  {cnpjLookup.loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                  Consultar
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Digite o CNPJ: os dados públicos da empresa são preenchidos automaticamente. Confira antes de cadastrar.
              </p>
            </div>

            {/* Linha 1b: Razão Social e Nome Fantasia */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Razão Social *</Label>
                <Input
                  placeholder="Digite a razão social"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  className="h-11 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Nome Fantasia (opcional)</Label>
                <Input
                  placeholder="Nome comercial da empresa"
                  value={newSupplierTradeName}
                  onChange={(e) => setNewSupplierTradeName(e.target.value)}
                  className="h-11 text-base"
                />
              </div>
            </div>

            {/* Linha 2: CEP e Endereço */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">CEP *</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="00000-000"
                    value={newSupplierCEP}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      setNewSupplierCEP(value);
                      if (value.length === 8) {
                        handleSearchCEP(value);
                      }
                    }}
                    className="h-11 text-base flex-1"
                    disabled={loadingCEP}
                  />
                </div>
              </div>
              <div className="col-span-2 space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Endereço *</Label>
                <Input
                  placeholder="Rua, avenida, etc."
                  value={newSupplierAddress}
                  onChange={(e) => setNewSupplierAddress(e.target.value)}
                  className="h-11 text-base"
                  disabled={loadingCEP}
                />
              </div>
            </div>

            {/* Linha 3: Cidade e Estado */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Cidade</Label>
                <Input
                  placeholder="Cidade"
                  value={newSupplierCity}
                  onChange={(e) => setNewSupplierCity(e.target.value)}
                  className="h-11 text-base"
                  disabled={loadingCEP}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Estado</Label>
                <Input
                  placeholder="UF"
                  value={newSupplierState}
                  onChange={(e) => setNewSupplierState(e.target.value.toUpperCase())}
                  className="h-11 text-base"
                  maxLength={2}
                  disabled={loadingCEP}
                />
              </div>
            </div>

            {/* Linha 4: Telefone e Email */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">Telefone *</Label>
                <Input
                  placeholder="(11) 99999-9999"
                  value={newSupplierPhone}
                  onChange={(e) => setNewSupplierPhone(e.target.value)}
                  className="h-11 text-base"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-gray-700">E-mail (opcional)</Label>
                <Input
                  placeholder="email@empresa.com"
                  type="email"
                  value={newSupplierEmail}
                  onChange={(e) => setNewSupplierEmail(e.target.value)}
                  className="h-11 text-base"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNewSupplierDialog(false)}
              className="h-11 px-6"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAddNewSupplier}
              disabled={loadingCEP || cnpjLookup.loading}
              className="h-11 px-6 bg-blue-600 hover:bg-blue-700"
            >
              {loadingCEP ? "Buscando CEP..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardLayout from "./components/DashboardLayout";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "@/_core/hooks/useAuth";
import Home from "./pages/Home";
import Products from "./pages/Products";
import ProductsEstoque from "./pages/ProductsEstoque";
import ProductsEspecificos from "./pages/ProductsEspecificos";
import Stock from "./pages/Stock";
import PurchaseOrders from "./pages/PurchaseOrders";
import NewPurchaseOrder from "./pages/NewPurchaseOrder";
import EditPurchaseOrder from "./pages/EditPurchaseOrder";
import PurchaseRequests from "./pages/PurchaseRequests";
import NewPurchaseRequest from "./pages/NewPurchaseRequest";
import PurchaseRequestDetails from "./pages/PurchaseRequestDetails";
import EditPurchaseRequest from "./pages/EditPurchaseRequest";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import ExitRequests from "./pages/ExitRequests";
import NewExitRequest from "./pages/NewExitRequest";
import ExitRequestDetails from "./pages/ExitRequestDetails";
import Login from "./pages/Login";
import Users from "./pages/Users";
import Account from "./pages/Account";
import AssetDashboard from "./pages/AssetDashboard";
import AssetList from "./pages/AssetList";
import AssetNew from "./pages/AssetNew";
import AssetDetails from "./pages/AssetDetails";
import AssetCategories from "./pages/AssetCategories";
import AssetLocations from "./pages/AssetLocations";
import AssetToolLoans from "./pages/AssetToolLoans";

function ProtectedRouter() {
  const { user, loading } = useAuth();

  // Se está carregando, mostrar loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se não está autenticado, redirecionar para login
  if (!user) {
    return (
      <Switch>
        <Route path={"/login"} component={Login} />
        {/* Redirecionar qualquer outra rota para login */}
        <Route component={Login} />
      </Switch>
    );
  }

  // Se está autenticado, mostrar o dashboard
  return (
    <DashboardLayout>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/products"} component={Products} />
        <Route path={"/products/estoque"} component={ProductsEstoque} />
        <Route path={"/products/especificos"} component={ProductsEspecificos} />
        <Route path={"/stock"} component={Stock} />
        <Route path={"/purchase-orders"} component={PurchaseOrders} />
        <Route path={"/purchase-orders/new"} component={NewPurchaseOrder} />
        <Route path={"/purchase-orders/edit/:id"} component={EditPurchaseOrder} />
        <Route path={"/purchase-requests"} component={PurchaseRequests} />
        <Route path={"/purchase-requests/new"} component={NewPurchaseRequest} />
        <Route path={"/purchase-requests/:id/edit"} component={EditPurchaseRequest} />
        <Route path={"/purchase-requests/:id"} component={PurchaseRequestDetails} />
        <Route path={"/exit-requests"} component={ExitRequests} />
        <Route path={"/exit-requests/new"} component={NewExitRequest} />
        <Route path={"/exit-requests/:id"} component={ExitRequestDetails} />
        <Route path={"/reports"} component={Reports} />
        <Route path={"/patrimonio"} component={AssetDashboard} />
        <Route path={"/patrimonio/bens"} component={AssetList} />
        <Route path={"/patrimonio/novo"} component={AssetNew} />
        <Route path={"/patrimonio/bens/:id"} component={AssetDetails} />
        <Route path={"/patrimonio/categorias"} component={AssetCategories} />
        <Route path={"/patrimonio/locais"} component={AssetLocations} />
        <Route path={"/patrimonio/ferramentas"} component={AssetToolLoans} />
        <Route path={"/settings"} component={Settings} />
        <Route path={"/users"} component={Users} />
        <Route path={"/minha-conta"} component={Account} />
        <Route path={"/404"} component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <ProtectedRouter />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

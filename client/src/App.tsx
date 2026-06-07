import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import CanvasPage from "./pages/CanvasPage";
import FontsPage from "./pages/FontsPage";
import ColorsPage from "./pages/ColorsPage";
import CodePage from "./pages/CodePage";
import MediaPage from "./pages/MediaPage";
import BookmarksPage from "./pages/BookmarksPage";
import DemoPage from "./pages/DemoPage";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/login"} component={LoginPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/canvas" component={CanvasPage} />
      <Route path="/fonts" component={FontsPage} />
      <Route path="/colors" component={ColorsPage} />
      <Route path="/code" component={CodePage} />
      <Route path="/media" component={MediaPage} />
      <Route path="/bookmarks" component={BookmarksPage} />
      <Route path="/demo" component={DemoPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster
            toastOptions={{
              style: {
                fontFamily: "'Space Grotesk', sans-serif",
                fontWeight: 700,
                borderRadius: 0,
                border: "2px solid #141414",
              },
            }}
          />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

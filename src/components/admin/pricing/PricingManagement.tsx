import { useState, Component, type ReactNode } from 'react';
import CommissionTiersEditor from './CommissionTiersEditor';
import ResidualCurvesEditor from './ResidualCurvesEditor';
import DefaultValuesEditor from './DefaultValuesEditor';
import { TrendingUp, Percent, Settings, AlertCircle, RotateCcw } from 'lucide-react';

type Tab = 'commission' | 'residual' | 'defaults';

class TabErrorBoundary extends Component<
  { children: ReactNode; tabName: string },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; tabName: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error in ${this.props.tabName} tab:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-400 mb-2">
                Error loading {this.props.tabName}
              </h3>
              <p className="text-surface-100/60 text-sm mb-3">
                This component encountered an error while rendering.
              </p>
              {this.state.error && (
                <pre className="text-red-300 text-xs bg-red-500/5 border border-red-500/20 rounded-lg p-3 mb-4 overflow-x-auto whitespace-pre-wrap">
                  {this.state.error.message}
                </pre>
              )}
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-200 text-sm transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const PricingManagement = () => {
  const [activeTab, setActiveTab] = useState<Tab>('commission');

  const tabs = [
    {
      id: 'commission' as Tab,
      label: 'Commission Tiers',
      icon: TrendingUp,
      description: 'Set commission rates based on margin',
    },
    {
      id: 'residual' as Tab,
      label: 'Residual Curves',
      icon: Percent,
      description: 'Define residual values by chemistry and term',
    },
    {
      id: 'defaults' as Tab,
      label: 'Default Values',
      icon: Settings,
      description: 'Set default values for new quotes',
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'commission':
        return (
          <TabErrorBoundary key="commission" tabName="Commission Tiers">
            <CommissionTiersEditor />
          </TabErrorBoundary>
        );
      case 'residual':
        return (
          <TabErrorBoundary key="residual" tabName="Residual Curves">
            <ResidualCurvesEditor />
          </TabErrorBoundary>
        );
      case 'defaults':
        return (
          <TabErrorBoundary key="defaults" tabName="Default Values">
            <DefaultValuesEditor />
          </TabErrorBoundary>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-surface-100 mb-2">Pricing Configuration</h2>
        <p className="text-surface-100/60">
          Configure pricing parameters and default values for the quotation system
        </p>
      </div>

      <div className="bg-surface-700/50 backdrop-blur-xl border border-surface-600/50 rounded-2xl p-2">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${
                    isActive
                      ? 'bg-brand-500 text-surface-100 shadow-lg shadow-brand-500/20'
                      : 'bg-surface-800/40 text-surface-100/60 hover:bg-surface-700/50 hover:text-surface-100'
                  }
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <div className="text-left flex-1 min-w-0">
                  <div className="font-semibold text-sm">{tab.label}</div>
                  <div className="text-xs opacity-80 truncate">{tab.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-[600px]">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default PricingManagement;
